"use client";
import { tokenLabel } from "@/lib/contract";

interface Props {
  members: readonly `0x${string}`[];
  paid: readonly boolean[];
  currentRound: bigint;
  userAddress?: `0x${string}`;
}

export function MemberList({ members, paid, currentRound, userAddress }: Props) {
  return (
    <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 overflow-hidden">
      {members.map((addr, i) => (
        <li key={addr} className="flex items-center justify-between px-4 py-3 bg-white">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="font-mono text-sm text-gray-700">
              {addr.slice(0, 8)}…{addr.slice(-6)}
              {addr.toLowerCase() === userAddress?.toLowerCase() && (
                <span className="ml-2 text-xs text-blue-600 font-semibold">(you)</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {BigInt(i) === currentRound && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                Receiving next
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                paid[i]
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {paid[i] ? "Paid" : "Pending"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
