"use client";

import { Identity, Avatar, Name, Address } from "@coinbase/onchainkit/identity";

interface Props {
  members: readonly `0x${string}`[];
  paid: readonly boolean[];
  currentRound: bigint;
  userAddress?: `0x${string}`;
}

export function MemberList({ members, paid, currentRound, userAddress }: Props) {
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {members.map((addr, i) => {
        const isUser = addr.toLowerCase() === userAddress?.toLowerCase();
        const isReceivingNext = BigInt(i) === currentRound;
        const hasPaid = paid[i];

        return (
          <li
            key={addr}
            className={`flex items-center justify-between p-3.5 transition-colors ${
              isUser ? "bg-blue-50/50 dark:bg-blue-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
            }`}
          >
            {/* Identity section */}
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>

              <Identity
                address={addr}
                schemaId="0xf8b05c79f0f3ce59748b707c29f6195228241d6543b1387f0f7ac9d9dd94b9d8"
                className="flex items-center gap-2.5 !bg-transparent !p-0"
              >
                <Avatar address={addr} className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-700 shrink-0" />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <Name address={addr} className="font-semibold text-sm text-gray-900 dark:text-gray-100" />
                    {isUser && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        You
                      </span>
                    )}
                  </div>
                  <Address address={addr} className="text-xs text-gray-500 dark:text-gray-400 font-mono" />
                </div>
              </Identity>
            </div>

            {/* Badges section */}
            <div className="flex items-center gap-2 shrink-0">
              {isReceivingNext && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-sm">
                  <span>🏆</span> Receiving
                </span>
              )}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                  hasPaid
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${hasPaid ? "bg-green-500" : "bg-gray-400"}`} />
                {hasPaid ? "Paid" : "Pending"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
