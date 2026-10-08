
"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import { Identity, Avatar, Name, Address } from "@coinbase/onchainkit/identity";
import { CountdownTimer } from "@/components/CountdownTimer";

interface PayoutTimelineProps {
  members: readonly `0x${string}`[];
  paid: readonly boolean[];
  currentRound: bigint;
  cycleEnd: bigint;
  cycleDuration: bigint;
  contribution: bigint;
  tokenDecimals: number;
  tokenSymbol: string;
  status: number; // 0: Open, 1: Active, 2: Complete, 3: Cancelled
  maxMembers: bigint;
  userAddress?: `0x${string}`;
}

export function PayoutTimeline({
  members,
  paid,
  currentRound,
  cycleEnd,
  cycleDuration,
  contribution,
  tokenDecimals,
  tokenSymbol,
  status,
  maxMembers,
  userAddress,
}: PayoutTimelineProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };
  const roundIndex = Number(currentRound);
  const totalSeats = Math.max(members.length, Number(maxMembers));
  const activeMembersCount = members.length;
  const potSize = contribution * BigInt(activeMembersCount || 1);
  const formattedPot = formatUnits(potSize, tokenDecimals);
  const formattedContribution = formatUnits(contribution, tokenDecimals);
  const cycleDays = Math.round(Number(cycleDuration) / 86400) || 7;

  const paidCount = paid.filter(Boolean).length;
  const collectedPot = contribution * BigInt(paidCount);
  const formattedCollectedPot = formatUnits(collectedPot, tokenDecimals);

  // Find user's turn position
  const userTurnIndex = useMemo(() => {
    if (!userAddress) return -1;
    return members.findIndex(
      (m) => m.toLowerCase() === userAddress.toLowerCase()
    );
  }, [members, userAddress]);

  const isUserTurn = status === 1 && userTurnIndex === roundIndex;
  const isUserUpcoming = userTurnIndex > roundIndex;
  const isUserPaidOut = status === 2 || (userTurnIndex >= 0 && userTurnIndex < roundIndex);

  return (
    <div className="space-y-6">
      {/* ── User Status Callout Banner ── */}
      {userTurnIndex >= 0 ? (
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all ${
            isUserTurn
              ? "bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border-amber-300 dark:border-amber-700/60 shadow-sm"
              : isUserUpcoming
              ? "bg-emerald-50/70 dark:bg-[#08221D] border-emerald-200 dark:border-[#164738]"
              : "bg-slate-50 dark:bg-[#071F17]/60 border-slate-200 dark:border-[#164738]"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <span className="text-2xl sm:text-3xl mt-0.5">
              {isUserTurn ? "🏆" : isUserUpcoming ? "⭐" : "✓"}
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Your Payout Position
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isUserTurn
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 animate-pulse"
                      : isUserUpcoming
                      ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Round {userTurnIndex + 1} of {activeMembersCount}
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold text-[#0B3D2E] dark:text-white">
                {isUserTurn
                  ? `🎉 You are the designated beneficiary for Round ${userTurnIndex + 1}! You will receive the pooled pot of ${formattedPot} ${tokenSymbol}.`
                  : isUserUpcoming
                  ? `Your turn is Round ${userTurnIndex + 1}. Estimated payout in ~${
                      (userTurnIndex - roundIndex) * cycleDays
                    } days (${formattedPot} ${tokenSymbol}).`
                  : isUserPaidOut
                  ? `You received your pot payout in Round ${userTurnIndex + 1} (${formattedPot} ${tokenSymbol}). Remember to keep contributing for other circle members!`
                  : `You are scheduled for Round ${userTurnIndex + 1}.`}
              </p>
            </div>
          </div>
        </div>
      ) : status === 0 && activeMembersCount < Number(maxMembers) ? (
        <div className="rounded-2xl p-4 sm:p-5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3.5">
          <span className="text-2xl sm:text-3xl mt-0.5">🎯</span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Claim Your Turn
            </h4>
            <p className="text-sm font-semibold text-blue-950 dark:text-blue-100 mt-0.5">
              Turn order is first-come, first-served. Join now to claim Turn #{activeMembersCount + 1} and receive {formattedPot} {tokenSymbol} in Round {activeMembersCount + 1}!
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Active Round Spotlight Card (if club is active) ── */}
      {status === 1 && roundIndex < members.length && (
        <div className="rounded-3xl bg-gradient-to-br from-[#0B3D2E] via-[#0E4937] to-[#07241B] p-6 text-white shadow-xl border border-emerald-500/30 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Active Round {roundIndex + 1}
                </span>
                <span className="text-xs text-white/60">
                  of {activeMembersCount} cycles
                </span>
              </div>
              <h3 className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight">
                Current Pot: {formattedPot} {tokenSymbol}
              </h3>
            </div>

            {/* Countdown box */}
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 px-4 border border-white/10 flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Round Deadline
                </p>
                <div className="text-sm font-extrabold text-amber-300">
                  <CountdownTimer cycleEnd={cycleEnd} />
                </div>
              </div>
            </div>
          </div>

          {/* Current Beneficiary Info */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <Avatar
                  address={members[roundIndex]}
                  className="h-11 w-11 rounded-full border-2 border-emerald-400/60 shrink-0"
                />
                <span className="absolute -bottom-1 -right-1 text-sm">🏆</span>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Receiving Pot This Round
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Identity
                    address={members[roundIndex]}
                    schemaId="0xf8b05c79f0f3ce59748b707c29f6195228241d6543b1387f0f7ac9d9dd94b9d8"
                    className="flex items-center gap-2 !bg-transparent !p-0"
                  >
                    <Name
                      address={members[roundIndex]}
                      className="font-bold text-sm text-white"
                    />
                    <Address
                      address={members[roundIndex]}
                      hasCopyAddressOnClick={false}
                      className="text-xs text-white/60 font-mono"
                    />
                  </Identity>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(members[roundIndex]);
                    }}
                    className="p-1 rounded-md hover:bg-emerald-800/60 text-emerald-300 hover:text-white transition-colors inline-flex items-center"
                    title="Copy full address"
                    aria-label="Copy full address"
                  >
                    {copiedAddress === members[roundIndex] ? (
                      <span className="text-[10px] font-semibold text-emerald-200">
                        ✓ Copied
                      </span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {members[roundIndex].toLowerCase() === userAddress?.toLowerCase() && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-400 text-[#0B3D2E]">
                      You
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Turn Index
              </p>
              <p className="text-sm font-extrabold text-white">
                Turn #{roundIndex + 1}
              </p>
            </div>
          </div>

          {/* Pot Collection Progress Bar */}
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-white/80">
                Collection Status: {paidCount} of {activeMembersCount} Paid
              </span>
              <span className="text-emerald-300 font-mono">
                {formattedCollectedPot} / {formattedPot} {tokenSymbol} (
                {Math.round((paidCount / (activeMembersCount || 1)) * 100)}%)
              </span>
            </div>

            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-[#22C55E] rounded-full transition-all duration-700 shadow-sm"
                style={{
                  width: `${Math.max(5, (paidCount / (activeMembersCount || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Summary Banner (if club complete) ── */}
      {status === 2 && (
        <div className="rounded-3xl bg-gradient-to-br from-[#0B3D2E] to-[#08291F] p-6 text-white text-center shadow-lg border border-emerald-500/40">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl mx-auto flex items-center justify-center mb-3">
            🎉
          </div>
          <h3 className="text-2xl font-black text-white">Circle Cycle Completed</h3>
          <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-md mx-auto">
            All {activeMembersCount} rounds have been executed successfully on Base. Every member has received their scheduled pot.
          </p>
        </div>
      )}

      {/* ── The Connected Timeline Track ── */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#164738] bg-white dark:bg-[#071F17] p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-[#164738]">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#0B3D2E] dark:text-white">
              Rotation Queue & Turn Order
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ordered list of member payout turns from Cycle 1 to {totalSeats}.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid Out
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Current
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> Scheduled
            </span>
          </div>
        </div>

        {/* Timeline Items */}
        <div className="relative pl-6 sm:pl-8 space-y-6">
          {/* Vertical connecting line */}
          <div className="absolute top-4 bottom-4 left-3 sm:left-4 -translate-x-1/2 w-0.5 bg-slate-200 dark:bg-[#164738]" />

          {Array.from({ length: totalSeats }).map((_, i) => {
            const isFilled = i < members.length;
            const memberAddr = isFilled ? members[i] : null;
            const isUser = memberAddr?.toLowerCase() === userAddress?.toLowerCase();

            // Status determination for this round
            const isPastRound = status === 2 || (status === 1 && i < roundIndex);
            const isCurrentRound = status === 1 && i === roundIndex;
            const isFutureRound = status === 1 ? i > roundIndex : status === 0;

            const roundPot = isFilled
              ? `${formattedPot} ${tokenSymbol}`
              : `~${formattedPot} ${tokenSymbol}`;

            const estimatedDays =
              status === 1 && i > roundIndex
                ? `~${(i - roundIndex) * cycleDays} days`
                : status === 0
                ? `Cycle ${i + 1}`
                : null;

            return (
              <div key={i} className="relative group">
                {/* Node marker on the vertical track */}
                <div
                  className={`absolute -left-6 sm:-left-8 -translate-x-1/2 mt-3.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold transition-transform group-hover:scale-110 shadow-sm ${
                    isPastRound
                      ? "bg-[#22C55E] text-white ring-4 ring-green-100 dark:ring-green-950/60"
                      : isCurrentRound
                      ? "bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950/60 animate-pulse"
                      : isFilled
                      ? "bg-slate-100 dark:bg-[#0E3529] border-2 border-slate-300 dark:border-[#1F5444] text-slate-600 dark:text-slate-300"
                      : "bg-white dark:bg-[#071F17] border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  {isPastRound ? "✓" : i + 1}
                </div>

                {/* Round Card */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                    isCurrentRound
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-md ring-1 ring-amber-300/40"
                      : isPastRound
                      ? "bg-emerald-50/20 dark:bg-[#08221D]/40 border-slate-200/80 dark:border-[#164738]/60"
                      : isUser
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-50/60 dark:bg-[#0A261E]/40 border-slate-200 dark:border-[#164738]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Round & Member Info */}
                    <div className="flex items-center gap-3.5">
                      {isFilled && memberAddr ? (
                        <>
                          <Avatar
                            address={memberAddr}
                            className={`h-10 w-10 rounded-full border shrink-0 ${
                              isCurrentRound
                                ? "border-amber-400 ring-2 ring-amber-200 dark:ring-amber-900"
                                : "border-slate-200 dark:border-gray-700"
                            }`}
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Round {i + 1}
                              </span>
                              {isUser && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                                  Your Turn
                                </span>
                              )}
                              {isCurrentRound && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  Active Beneficiary
                                </span>
                              )}
                              {isPastRound && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300">
                                  ✓ Payout Disbursed
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <Identity
                                address={memberAddr}
                                schemaId="0xf8b05c79f0f3ce59748b707c29f6195228241d6543b1387f0f7ac9d9dd94b9d8"
                                className="flex items-center gap-2 !bg-transparent !p-0"
                              >
                                <Name
                                  address={memberAddr}
                                  className="font-bold text-sm text-[#0B3D2E] dark:text-white"
                                />
                                <Address
                                  address={memberAddr}
                                  hasCopyAddressOnClick={false}
                                  className="text-xs text-slate-400 dark:text-slate-400 font-mono"
                                />
                              </Identity>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(memberAddr);
                                }}
                                className="p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex items-center"
                                title="Copy address"
                                aria-label="Copy address"
                              >
                                {copiedAddress === memberAddr ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    ✓ Copied
                                  </span>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 grid place-items-center text-slate-400 text-sm font-bold shrink-0">
                            +
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Round {i + 1}
                            </span>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                              Open Seat — Available to claim
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Pot Amount & Timing */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-[#164738]/60 text-left sm:text-right shrink-0">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Payout Pot</p>
                        <p className="text-sm font-extrabold text-[#0B3D2E] dark:text-white font-mono">
                          {roundPot}
                        </p>
                      </div>

                      <div className="sm:min-w-[100px]">
                        <p className="text-xs text-slate-400 font-medium">Status / Schedule</p>
                        <p
                          className={`text-xs font-bold ${
                            isPastRound
                              ? "text-[#22C55E]"
                              : isCurrentRound
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isPastRound
                            ? "Complete"
                            : isCurrentRound
                            ? "Current Cycle"
                            : estimatedDays
                            ? `Est. in ${estimatedDays}`
                            : "Scheduled"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Micro-contributions indicator for current round */}
                  {isCurrentRound && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                          Round Contributions: {paidCount} / {activeMembersCount} collected
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {formattedContribution} {tokenSymbol} per member
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
