"use client";

import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "viem";
import {
  useGetClub,
  useGetMemberPaymentStatus,
  useJoinClub,
  useTriggerPayout,
  useStartClub,
  useIsVerified,
} from "@/hooks/useAjoClub";
import { useAccount } from "wagmi";
import { tokenLabel, tokenDecimals, AJO_CLUB_ADDRESS } from "@/lib/contract";
import { MemberList } from "@/components/MemberList";
import { CountdownTimer } from "@/components/CountdownTimer";
import { waitForTransactionReceipt } from "@/lib/wagmi";
import { Navbar } from "@/components/Navbar";
import { friendlyError } from "@/lib/errors";
import { useState } from "react";
import Link from "next/link";

const STATUS = ["Open", "Active", "Complete", "Cancelled"];
const STATUS_BADGE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800",
];

export default function ClubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  let clubId: bigint;
  try {
    clubId = BigInt(id);
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="p-6 text-center pt-20">
          <p className="text-red-500 font-semibold mb-2">Invalid circle ID.</p>
          <Link href="/clubs" className="text-sm text-blue-600 dark:text-blue-400 underline">
            Browse all circles
          </Link>
        </main>
      </div>
    );
  }

  const { address, isConnected } = useAccount();

  const { data: club, isLoading, refetch } = useGetClub(clubId);
  const { data: paymentData, refetch: refetchPayments } = useGetMemberPaymentStatus(clubId);
  const { data: isVerified } = useIsVerified(address);
  const { joinClub, isPending: isJoining } = useJoinClub();
  const { triggerPayout, isPending: isTriggering } = useTriggerPayout();
  const { startClub, isPending: isStarting } = useStartClub();

  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading || !club) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="p-6 text-center text-gray-400 dark:text-gray-500 pt-20 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading circle details…</p>
        </main>
      </div>
    );
  }

  const [name, token, contribution, cycleDuration, gracePeriod, maxMembers, currentRound, cycleEnd, status, members] = club;
  const [, paid] = paymentData ?? [[], []];

  const decimals = tokenDecimals(token);
  const isMember = members.some((m: string) => m.toLowerCase() === address?.toLowerCase());
  const userIndex = members.findIndex((m: string) => m.toLowerCase() === address?.toLowerCase());
  const userHasPaid = isMember && userIndex >= 0 ? Boolean(paid[userIndex]) : false;
  const allPaid = paid.length > 0 && paid.every(Boolean);
  const cycleEnded = Number(cycleEnd) > 0 && Date.now() / 1000 >= Number(cycleEnd);
  const potSize = contribution * BigInt(members.length || 1);

  // Time calculations
  const now = Date.now() / 1000;
  const hoursUntilEnd = Number(cycleEnd) > 0 ? (Number(cycleEnd) - now) / 3600 : 0;
  const showReminderBanner = status === 1 && isMember && !userHasPaid && hoursUntilEnd > 0 && hoursUntilEnd <= 48;

  async function handleJoin() {
    setActionError(null);
    try {
      const hash = await joinClub(clubId);
      await waitForTransactionReceipt({ hash });
      refetch();
      refetchPayments();
    } catch (e) {
      setActionError(friendlyError(e as Error));
    }
  }

  async function handleTrigger() {
    setActionError(null);
    try {
      const hash = await triggerPayout(clubId);
      await waitForTransactionReceipt({ hash });
      refetch();
      refetchPayments();
    } catch (e) {
      setActionError(friendlyError(e as Error));
    }
  }

  async function handleStart() {
    setActionError(null);
    try {
      const hash = await startClub(clubId);
      await waitForTransactionReceipt({ hash });
      refetch();
      refetchPayments();
    } catch (e) {
      setActionError(friendlyError(e as Error));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 pb-32">
        {/* Navigation */}
        <Link
          href="/clubs"
          className="text-xs text-gray-500 dark:text-gray-400 mb-6 inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          ← Back to all circles
        </Link>

        {/* Header Card */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🫙</span>
                <h1 className="text-2xl font-extrabold tracking-tight">{name}</h1>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                Circle #{clubId.toString()} · Base Sepolia
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                STATUS_BADGE[status] ?? STATUS_BADGE[2]
              }`}
            >
              {STATUS[status] ?? "Unknown"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 text-xs">
            <div>
              <span className="text-gray-400 dark:text-gray-500 block">Contribution</span>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {formatUnits(contribution, decimals)} {tokenLabel(token)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 block">Cycle Cadence</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {Math.round(Number(cycleDuration) / 86400)} days
              </span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 block">Members</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {members.length} / {maxMembers.toString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 block">Round</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {status === 1 ? `${Number(currentRound) + 1} of ${members.length}` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Due Reminder Banner */}
        {showReminderBanner && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 mb-6 shadow-sm">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5 mb-1">
              <span>⏰</span> Payment Due Soon
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your contribution of {formatUnits(contribution, decimals)} {tokenLabel(token)} is due within {Math.ceil(hoursUntilEnd)} hours.
            </p>
          </div>
        )}

        {/* Active Pot Card */}
        {status === 1 && (
          <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800/60 p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                Round {Number(currentRound) + 1} Pot
              </span>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                {formatUnits(potSize, decimals)} {tokenLabel(token)}
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Paid out to round recipient upon cycle completion
              </p>
            </div>
            <div className="text-left sm:text-right bg-white/60 dark:bg-gray-900/60 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/50">
              <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">
                Cycle ends in
              </span>
              <CountdownTimer cycleEnd={cycleEnd} />
            </div>
          </div>
        )}

        {/* Member Roster with Basenames */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Circle Members ({members.length})
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Powered by OnchainKit & Basenames
            </span>
          </div>

          {members.length > 0 ? (
            <MemberList
              members={members}
              paid={paid.length > 0 ? paid : Array(members.length).fill(false)}
              currentRound={currentRound}
              userAddress={address}
            />
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              No members yet. Be the first to join!
            </p>
          )}
        </div>

        {/* Error message */}
        {actionError && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 mb-6 text-xs text-red-700 dark:text-red-300 text-center">
            {actionError}
          </div>
        )}

        {/* Contract Link */}
        <div className="text-center">
          <a
            href={`https://sepolia.basescan.org/address/${AJO_CLUB_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-blue-500 underline font-mono"
          >
            View contract on Basescan ↗
          </a>
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-30">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {!isConnected ? (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
              Connect your wallet at the top right to join or interact with this circle.
            </p>
          ) : (
            <>
              {/* Join Club */}
              {status === 0 && !isMember && (
                <button
                  onClick={handleJoin}
                  disabled={isJoining || members.length >= Number(maxMembers)}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-md"
                >
                  {isJoining
                    ? "Confirming in Wallet…"
                    : members.length >= Number(maxMembers)
                    ? "Circle Full"
                    : "Join Circle"}
                </button>
              )}

              {/* Start Club (Creator only) */}
              {status === 0 && isMember && members.length === Number(maxMembers) && (
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-md"
                >
                  {isStarting ? "Starting Circle…" : "Start Circle (All Seats Filled)"}
                </button>
              )}

              {/* Waiting for seats to fill */}
              {status === 0 && isMember && members.length < Number(maxMembers) && (
                <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Waiting for members to join ({members.length}/{maxMembers.toString()} spots filled)
                </div>
              )}

              {/* Contribute Button */}
              {status === 1 && isMember && !userHasPaid && (
                <Link href={`/club/${clubId}/contribute`} className="w-full">
                  <button className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base transition-all shadow-md flex items-center justify-center gap-2">
                    <span>⚡</span> Contribute {formatUnits(contribution, decimals)} {tokenLabel(token)} (Gasless)
                  </button>
                </Link>
              )}

              {/* Already Paid */}
              {status === 1 && isMember && userHasPaid && !allPaid && (
                <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-1.5">
                  <span className="text-green-500 font-bold">✓</span> You paid this round! Waiting for remaining members…
                </div>
              )}

              {/* Trigger Payout */}
              {status === 1 && allPaid && cycleEnded && (
                <button
                  onClick={handleTrigger}
                  disabled={isTriggering}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-base transition-all shadow-md"
                >
                  {isTriggering ? "Sending Payout…" : "Trigger Payout"}
                </button>
              )}

              {/* Completed */}
              {status === 2 && (
                <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  This circle has completed all rounds.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
