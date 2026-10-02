"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { tokenLabel, tokenDecimals } from "@/lib/contract";

interface Props {
  clubId: bigint;
  name: string;
  token: `0x${string}`;
  contribution: bigint;
  members: readonly `0x${string}`[];
  maxMembers: bigint;
  status: number;
}

const STATUS_LABEL = ["Open", "Active", "Complete", "Cancelled"];
const STATUS_BADGE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800",
];

export function ClubCard({ clubId, name, token, contribution, members, maxMembers, status }: Props) {
  const decimals = tokenDecimals(token);
  const potTotal = contribution * BigInt(members.length || 1);

  return (
    <Link href={`/club/${clubId}`} className="block group">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl transform group-hover:scale-110 transition-transform">🫙</span>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {name}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                Circle #{clubId.toString()}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              STATUS_BADGE[status] ?? STATUS_BADGE[2]
            }`}
          >
            {STATUS_LABEL[status] ?? "Unknown"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80 text-xs">
          <div>
            <span className="text-gray-400 dark:text-gray-500 block">Contribution</span>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
              {formatUnits(contribution, decimals)} {tokenLabel(token)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 dark:text-gray-500 block">Members</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {members.length} / {maxMembers.toString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
