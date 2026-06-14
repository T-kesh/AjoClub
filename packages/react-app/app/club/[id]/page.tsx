"use client";
import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useGetClub, useGetMemberPaymentStatus, useJoinClub, useTriggerPayout, useStartClub } from "@/hooks/useAjoClub";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useSelfVerify } from "@/hooks/useSelfVerify";
import { tokenLabel } from "@/lib/contract";
import { MemberList } from "@/components/MemberList";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ContributeButton } from "@/components/ContributeButton";

const STATUS = ["Open", "Active", "Complete"];

export default function ClubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const clubId = BigInt(id);
  const { address } = useMiniPay();

  const { data: club, isLoading, refetch } = useGetClub(clubId);
  const { data: paymentData } = useGetMemberPaymentStatus(clubId);
  const { isVerified, startVerification } = useSelfVerify(address);
  const { joinClub, isPending: isJoining } = useJoinClub();
  const { triggerPayout, isPending: isTriggering } = useTriggerPayout();
  const { startClub, isPending: isStarting } = useStartClub();

  if (isLoading || !club) {
    return <main className="p-6 text-center text-gray-400">Loading…</main>;
  }

  const [name, token, contribution, , maxMembers, currentRound, cycleEnd, status, members] = club;
  const [, paid] = paymentData ?? [[], []];

  const isMember = members.some((m) => m.toLowerCase() === address?.toLowerCase());
  const userHasPaid = isMember && address
    ? paid[members.findIndex((m) => m.toLowerCase() === address.toLowerCase())]
    : false;
  const allPaid = paid.length > 0 && paid.every(Boolean);
  const cycleEnded = Number(cycleEnd) > 0 && Date.now() / 1000 >= Number(cycleEnd);
  const potSize = contribution * BigInt(members.length);

  async function handleJoin() {
    if (!isVerified) {
      startVerification(`/club/${id}`);
      return;
    }
    await joinClub(clubId);
    refetch();
  }

  async function handleTrigger() {
    await triggerPayout(clubId);
    refetch();
  }

  async function handleStart() {
    await startClub(clubId);
    refetch();
  }

  return (
    <main className="max-w-md mx-auto p-6 pb-24">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">{name}</h1>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{STATUS[status]}</span>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {formatUnits(contribution, 18)} {tokenLabel(token)} · {members.length}/{maxMembers.toString()} members
      </p>

      {status === 1 && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-green-600 font-medium">Pot this round</p>
            <p className="text-2xl font-bold text-green-700">
              {formatUnits(potSize, 18)} {tokenLabel(token)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Cycle ends in</p>
            <CountdownTimer cycleEnd={cycleEnd} />
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Members</h2>
          <MemberList
            members={members}
            paid={paid}
            currentRound={currentRound}
            userAddress={address}
          />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          {status === 0 && !isMember && (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold text-lg transition-colors"
            >
              {isJoining ? "Joining…" : "Join Club"}
            </button>
          )}
          {status === 0 && isMember && members.length === Number(maxMembers) && (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-lg transition-colors"
            >
              {isStarting ? "Starting…" : "Start Club"}
            </button>
          )}
          {status === 1 && isMember && !userHasPaid && (
            <ContributeButton clubId={clubId} />
          )}
          {status === 1 && allPaid && cycleEnded && (
            <button
              onClick={handleTrigger}
              disabled={isTriggering}
              className="w-full py-3 rounded-2xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold text-lg transition-colors"
            >
              {isTriggering ? "Sending payout…" : "Trigger Payout"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
