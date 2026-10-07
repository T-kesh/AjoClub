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
import { PayoutTimeline } from "@/components/PayoutTimeline";
import { TestnetHelper } from "@/components/TestnetHelper";
import { CountdownTimer } from "@/components/CountdownTimer";
import { waitForTransactionReceipt } from "@/lib/wagmi";
import { Navbar } from "@/components/Navbar";
import { friendlyError } from "@/lib/errors";
import { useState, useMemo } from "react";
import Link from "next/link";

const STATUS = ["Open", "Active", "Complete", "Cancelled"];

export default function ClubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const clubId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return undefined;
    }
  }, [id]);

  const { address, isConnected } = useAccount();

  const { data: club, isLoading, refetch } = useGetClub(clubId);
  const { data: paymentData, refetch: refetchPayments } = useGetMemberPaymentStatus(clubId);
  const { data: isVerified } = useIsVerified(address);
  const { joinClub, isPending: isJoining } = useJoinClub();
  const { triggerPayout, isPending: isTriggering } = useTriggerPayout();
  const { startClub, isPending: isStarting } = useStartClub();

  const [activeTab, setActiveTab] = useState<"timeline" | "members" | "details" | "activity">("timeline");
  const [actionError, setActionError] = useState<string | null>(null);

  if (clubId === undefined) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17]">
        <Navbar />
        <main className="container-app py-16 text-center">
          <p className="text-red-500 font-bold mb-2">Invalid circle ID.</p>
          <Link href="/clubs" className="text-sm text-[#0B7A4B] dark:text-[#22C55E] underline">
            Browse all clubs
          </Link>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17]">
        <Navbar />
        <main className="container-app py-20 text-center flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-500">Loading club details from Base…</p>
        </main>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17]">
        <Navbar />
        <main className="container-app py-20 text-center flex flex-col items-center">
          <div className="card p-10 max-w-sm w-full flex flex-col items-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/40 text-3xl mx-auto mb-4">
              🫙
            </div>
            <h2 className="text-xl font-extrabold text-[#0B3D2E] dark:text-white mb-2">
              Club Not Found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Circle #{id} doesn&apos;t exist on Base Sepolia. It may have been cancelled or the ID is incorrect.
            </p>
            <Link href="/clubs" className="btn-green px-5 py-2.5 text-sm">
              Browse All Clubs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const [name, token, contribution, cycleDuration, gracePeriod, maxMembers, currentRound, cycleEnd, status, members] = club;
  const [, paid] = paymentData ?? [[], []];

  const decimals = tokenDecimals(token);
  const symbol = tokenLabel(token);
  const isMember = members.some((m: string) => m.toLowerCase() === address?.toLowerCase());
  const userIndex = members.findIndex((m: string) => m.toLowerCase() === address?.toLowerCase());
  const userHasPaid = isMember && userIndex >= 0 ? Boolean(paid[userIndex]) : false;
  const paidCount = paid.filter(Boolean).length;
  const allPaid = paid.length > 0 && paid.every(Boolean);
  const cycleEnded = Number(cycleEnd) > 0 && Date.now() / 1000 >= Number(cycleEnd);
  const potSize = contribution * BigInt(members.length || 1);
  const cycleDays = Math.round(Number(cycleDuration) / 86400);

  // Time calculations
  const now = Date.now() / 1000;
  const hoursUntilEnd = Number(cycleEnd) > 0 ? (Number(cycleEnd) - now) / 3600 : 0;
  const showReminderBanner = status === 1 && isMember && !userHasPaid && hoursUntilEnd > 0 && hoursUntilEnd <= 48;

  async function handleJoin() {
    if (clubId === undefined) return;
    if (isVerified === false) {
      setActionError("Identity verification with Self Protocol is required before joining a circle. Please verify your identity first.");
      return;
    }
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
    if (clubId === undefined) return;
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
    if (clubId === undefined) return;
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
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="container-app py-8 pb-32 flex-1">
        {/* Back Link */}
        <Link
          href="/clubs"
          className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B3D2E] dark:hover:text-white inline-flex items-center gap-1.5 transition-colors"
        >
          ← Back to clubs
        </Link>

        {/* 2-Column Responsive Layout matching mockup */}
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_.75fr] items-start">
          {/* Main Left Content */}
          <div className="space-y-6">
            {/* Club Header Card */}
            <div className="card p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0B3D2E] text-2xl text-white shadow-sm shrink-0">
                    🫙
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B3D2E] dark:text-white">
                        {name}
                      </h1>
                      <span className="text-[#22C55E] text-lg font-bold" title="Verified onchain">
                        ✓
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {members.length} members · {symbol} · {formatUnits(contribution, decimals)} {symbol} per cycle · {cycleDays} days
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold shrink-0 ${
                    status === 1
                      ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                      : status === 0
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {STATUS[status] ?? "Unknown"}
                </span>
              </div>

              {/* Active Cycle Box */}
              {status === 1 && (
                <div className="mt-6 rounded-3xl bg-[#0B3D2E] dark:bg-[#051F18] p-6 text-white shadow-lg border border-green-800/40">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                        Current Cycle {Number(currentRound) + 1} of {members.length}
                      </p>
                      <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        <CountdownTimer cycleEnd={cycleEnd} />
                      </div>
                    </div>
                    <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-[#22C55E]/40 text-sm font-bold bg-[#08291F]">
                      {paidCount}/{members.length}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#22C55E] transition-all duration-500"
                      style={{
                        width: `${Math.max(5, (paidCount / (members.length || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-white/60 font-medium">
                    <span>{paidCount} contributions received</span>
                    <span>Pot: {formatUnits(potSize, decimals)} {symbol}</span>
                  </div>
                </div>
              )}

              {/* Your Position & Quick Action Row */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 dark:bg-[#071F17]/60 p-4 border border-slate-100 dark:border-[#164738]/60">
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Your Position</p>
                  <p className="mt-1 font-bold text-base text-[#0B3D2E] dark:text-white">
                    {isMember
                      ? `#${userIndex + 1} of ${members.length}`
                      : "Not yet in this club"}
                  </p>
                </div>

                {status === 1 && isMember && !userHasPaid ? (
                  <Link
                    href={`/club/${clubId}/contribute`}
                    className="btn-green text-center font-bold flex items-center justify-center gap-2 text-base shadow-sm"
                  >
                    <span>⚡</span> Contribute (Gasless)
                  </Link>
                ) : status === 0 && !isMember ? (
                  isVerified === false ? (
                    <Link
                      href={`/verify?returnTo=/club/${clubId}`}
                      className="btn-primary text-center font-bold text-base shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>🛡️</span> Verify to Join
                    </Link>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={isJoining || members.length >= Number(maxMembers)}
                      className="btn-green disabled:opacity-50 text-center font-bold text-base shadow-sm"
                    >
                      {isJoining ? "Joining…" : "Join This Club"}
                    </button>
                  )
                ) : (
                  <div className="rounded-2xl bg-slate-50 dark:bg-[#071F17]/60 p-4 border border-slate-100 dark:border-[#164738]/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Round Status</p>
                      <p className="mt-0.5 font-bold text-sm text-[#0B3D2E] dark:text-white">
                        {status === 0
                          ? "Recruiting members"
                          : userHasPaid
                          ? "✓ You Paid"
                          : "Active Cycle"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Testnet Helper prompt if user owes contribution */}
            {status === 1 && isMember && !userHasPaid && (
              <TestnetHelper
                variant="banner"
                requiredAmount={formatUnits(contribution, decimals)}
                className="mt-2"
              />
            )}

            {/* Verification Helper banner if user is unverified */}
            {status === 0 && !isMember && isVerified === false && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🛡️</span>
                  <span className="text-amber-800 dark:text-amber-200 font-medium">
                    Self Protocol ZK Passport verification is required before joining a circle.
                  </span>
                </div>
                <Link
                  href={`/verify?returnTo=/club/${clubId}`}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors text-center shrink-0"
                >
                  Verify Now →
                </Link>
              </div>
            )}

            {/* Error prompt */}
            {actionError && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-xs font-semibold text-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}

            {/* Tabs & Roster Card */}
            <div className="card p-6 sm:p-7">
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-4 sm:gap-8 border-b border-slate-100 dark:border-[#164738] pb-4 text-sm font-bold">
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`transition-colors flex items-center gap-1.5 ${
                    activeTab === "timeline"
                      ? "text-[#0B3D2E] dark:text-[#22C55E] border-b-2 border-[#22C55E] pb-4 -mb-[18px]"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  <span>📅</span> Payout Timeline
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`transition-colors flex items-center gap-1.5 ${
                    activeTab === "members"
                      ? "text-[#0B3D2E] dark:text-[#22C55E] border-b-2 border-[#22C55E] pb-4 -mb-[18px]"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  <span>👥</span> Members ({members.length})
                </button>
                <button
                  onClick={() => setActiveTab("details")}
                  className={`transition-colors flex items-center gap-1.5 ${
                    activeTab === "details"
                      ? "text-[#0B3D2E] dark:text-[#22C55E] border-b-2 border-[#22C55E] pb-4 -mb-[18px]"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  <span>ℹ️</span> Details
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`transition-colors flex items-center gap-1.5 ${
                    activeTab === "activity"
                      ? "text-[#0B3D2E] dark:text-[#22C55E] border-b-2 border-[#22C55E] pb-4 -mb-[18px]"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  <span>📜</span> Activity
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-5">
                {activeTab === "timeline" && (
                  <PayoutTimeline
                    members={members}
                    paid={paid.length > 0 ? paid : Array(members.length).fill(false)}
                    currentRound={currentRound}
                    cycleEnd={cycleEnd}
                    cycleDuration={cycleDuration}
                    contribution={contribution}
                    tokenDecimals={decimals}
                    tokenSymbol={symbol}
                    status={status}
                    maxMembers={maxMembers}
                    userAddress={address}
                  />
                )}

                {activeTab === "members" && (
                  <div>
                    {members.length > 0 ? (
                      <MemberList
                        members={members}
                        paid={paid.length > 0 ? paid : Array(members.length).fill(false)}
                        currentRound={currentRound}
                        userAddress={address}
                      />
                    ) : (
                      <p className="text-center py-8 text-xs text-slate-400">
                        No members joined yet.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-[#164738]">
                      <span className="text-slate-500">Contract Address</span>
                      <span className="font-mono text-xs text-[#0B7A4B] dark:text-[#22C55E]">
                        {AJO_CLUB_ADDRESS}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-[#164738]">
                      <span className="text-slate-500">Grace Period</span>
                      <span className="font-bold">{Math.round(Number(gracePeriod) / 3600)} hours</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-[#164738]">
                      <span className="text-slate-500">Token Contract</span>
                      <span className="font-mono text-xs">{token}</span>
                    </div>
                  </div>
                )}

                {activeTab === "activity" && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <p>On-chain event logs indexed from Base Sepolia.</p>
                    <a
                      href={`https://sepolia.basescan.org/address/${AJO_CLUB_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[#0B7A4B] dark:text-[#22C55E] underline"
                    >
                      View transaction events on Basescan ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Club Summary Card */}
          <aside className="card p-6 sm:p-7 lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Club Summary
            </p>
            <div className="mt-5 space-y-4">
              {[
                ["Contribution", `${formatUnits(contribution, decimals)} ${symbol}`],
                ["Cycle Duration", `${cycleDays} days`],
                ["Members Filled", `${members.length} / ${maxMembers.toString()}`],
                ["Current Pot", `${formatUnits(potSize, decimals)} ${symbol}`],
                [
                  "Your Payout",
                  isMember ? `Round ${userIndex + 1}` : "Join to participate",
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between items-center border-b border-slate-100 dark:border-[#164738] pb-3.5 text-sm"
                >
                  <span className="text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="font-bold text-[#0B3D2E] dark:text-white">{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-2">
              <a
                href={`https://sepolia.basescan.org/address/${AJO_CLUB_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-secondary text-center text-xs py-3 block"
              >
                View on Basescan ↗
              </a>
            </div>
          </aside>
        </div>
      </main>

      {/* Floating Bottom Bar for Essential Lifecycle Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#071F17]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#164738] z-30 shadow-lg">
        <div className="container-app max-w-xl mx-auto flex flex-col gap-2">
          {!isConnected ? (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-1">
              Connect your wallet at the top right to interact with this circle.
            </p>
          ) : (
            <>
              {status === 0 && !isMember && (
                isVerified === false ? (
                  <Link href={`/verify?returnTo=/club/${clubId}`} className="w-full">
                    <button className="w-full btn-primary !py-3.5 text-base font-bold shadow-md flex items-center justify-center gap-2">
                      <span>🛡️</span> Verify Identity to Join Circle
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={isJoining || members.length >= Number(maxMembers)}
                    className="w-full btn-green !py-3.5 text-base font-bold shadow-md"
                  >
                    {isJoining ? "Joining…" : "Join Circle"}
                  </button>
                )
              )}

              {status === 0 && isMember && members.length === Number(maxMembers) && (
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="w-full btn-primary !py-3.5 text-base font-bold shadow-md"
                >
                  {isStarting ? "Starting Circle…" : "Start Circle (All Seats Filled)"}
                </button>
              )}

              {status === 1 && isMember && !userHasPaid && (
                <Link href={`/club/${clubId}/contribute`} className="w-full">
                  <button className="w-full btn-green !py-3.5 text-base font-bold shadow-md flex items-center justify-center gap-2">
                    <span>⚡</span> Contribute {formatUnits(contribution, decimals)} {symbol} (Gasless)
                  </button>
                </Link>
              )}

              {status === 1 && allPaid && cycleEnded && (
                <button
                  onClick={handleTrigger}
                  disabled={isTriggering}
                  className="w-full btn-green !py-3.5 text-base font-bold shadow-md"
                >
                  {isTriggering ? "Sending Payout…" : "Trigger Round Payout"}
                </button>
              )}

              {status === 2 && (
                <p className="text-center text-xs text-slate-500 py-1 font-semibold">
                  This circle has completed all rounds.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
