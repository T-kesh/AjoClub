"use client";

interface Props {
  members: readonly `0x${string}`[];
  paid: readonly boolean[];
  currentRound: bigint;
  userAddress?: `0x${string}`;
}

export function MemberList({ members, paid, currentRound, userAddress }: Props) {
  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {members.map((addr, i) => (
        <li key={addr} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {addr.slice(0, 8)}…{addr.slice(-6)}
              {addr.toLowerCase() === userAddress?.toLowerCase() && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">(you)</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {BigInt(i) === currentRound && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">
                Receiving next
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              paid[i]
                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}>
              {paid[i] ? "Paid" : "Pending"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
