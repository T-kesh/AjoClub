"use client";
import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useGetClub, useGetMemberPaymentStatus, useJoinClub, useTriggerPayout, useStartClub } from "@/hooks/useAjoClub";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useSelfVerify } from "@/hooks/useSelfVerify";
import { usePaymentReminder } from "@/hooks/usePaymentReminder";
import { tokenLabel } from "@/lib/contract";
import { MemberList } from "@/components/MemberList";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ContributeButton } from "@/components/ContributeButton";
import { waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/lib/celo";

const STATUS = ["Open", "Active", "Complete"];

export default function ClubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Safe BigInt parse — bad URL param shows error instead of crashing
  let clubId: bigint;
  try {
    clubId = BigInt(id);
  } catch {
    return (
      <main className="p-6 text-center">
        <p className="text-red-500">Invalid club ID.</p>
        <button onClick={() => router.push("/clubs")} className="mt-4 text-sm text-green-600 underline">
          Browse clubs
        </button>
      </main>
    );
  }

  const { address, isMiniPay } = useMiniPay();

  const { data: club, isLoading, refetch } = useGetClub(clubId);
  const { data: paymentData } = useGetMemberPaymentStatus(clubId);
  const { isVerified, startVerification } = useSelfVerify(address);
  const { joinClub, isPending: isJoining } = useJoinClub();
  const { triggerPayout, isPending: isTriggering } = useTriggerPayout();
  const { startClub, isPending: isStarting } = useStartClub();
  usePaymentReminder(clubId);

  if (isLoading || !club) {
    return <main className="p-6 text-center text-gray-400 dark:text-gray-500">Loading…</main>;
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

  // Calculate hours until cycle end for reminder banner
  const now = Date.now() / 1000;
  const hoursUntilEnd = Number(cycleEnd) > 0 ? (Number(cycleEnd) - now) / 3600 : 0;
  const showReminderBanner = status === 1 && isMember && !userHasPaid && hoursUntilEnd > 0 && hoursUntilEnd <= 48;

  async function handleJoin() {
    if (!isVerified) {
      startVerification(`/club/${id}`);
      return;
    }
    try {
      const hash = await joinClub(clubId);
      await waitForTransactionReceipt(wagmiConfig, { hash });
      refetch();
    } catch {}
  }

  async function handleTrigger() {
    try {
      const hash = await triggerPayout(clubId);
      await waitForTransactionReceipt(wagmiConfig, { hash });
      refetch();
    } catch {}
  }

  async function handleStart() {
    try {
      const hash = await startClub(clubId);
      await waitForTransactionReceipt(wagmiConfig, { hash });
      refetch();
    } catch {}
  }

  return (
    <main className="max-w-md mx-auto p-6 pb-24">
      <button onClick={() => router.back()} className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{STATUS[status]}</span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {formatUnits(contribution, 18)} {tokenLabel(token)} · {members.length}/{maxMembers.toString()} members
      </p>

      {showReminderBanner && (
        <div className="rounded-2xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 mb-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            ⏰ Your payment of {formatUnits(contribution, 18)} {tokenLabel(token)} is due in {Math.ceil(hoursUntilEnd)} hours
          </p>
        </div>
      )}

      {status === 1 && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Pot this round</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatUnits(potSize, 18)} {tokenLabel(token)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Cycle ends in</p>
            <CountdownTimer cycleEnd={cycleEnd} />
          </div>
        </div>
      )}

      {members.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Members</h2>
          <MemberList
            members={members}
            paid={paid.length > 0 ? paid : Array(members.length).fill(false)}
            currentRound={currentRound}
            userAddress={address}
          />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          {!isMiniPay ? (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">
              Open in <span className="font-semibold text-gray-500 dark:text-gray-400">MiniPay</span> to join or contribute.
            </p>
          ) : (
            <>
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
              {status === 0 && isMember && members.length < Number(maxMembers) && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 dark:text-gray-500">
                  Waiting for members ({members.length}/{maxMembers.toString()})
                </p>
              )}
              {status === 1 && isMember && !userHasPaid && (
                <ContributeButton clubId={clubId} />
              )}
              {status === 1 && isMember && userHasPaid && !allPaid && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 dark:text-gray-500">Waiting for other members to pay…</p>
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
              {status === 2 && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">This club has completed all rounds.</p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
