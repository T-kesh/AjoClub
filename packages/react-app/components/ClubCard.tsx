"use client";
import Link from "next/link";
import { formatUnits } from "viem";
import { tokenLabel } from "@/lib/contract";

interface Props {
  clubId: bigint;
  name: string;
  token: `0x${string}`;
  contribution: bigint;
  members: readonly `0x${string}`[];
  maxMembers: bigint;
  status: number;
}

const STATUS_LABEL = ["Open", "Active", "Complete"];
const STATUS_COLOR = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
];

export function ClubCard({ clubId, name, token, contribution, members, maxMembers, status }: Props) {
  return (
    <Link href={`/club/${clubId}`}>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatUnits(contribution, 18)} {tokenLabel(token)} per cycle
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {members.length} / {maxMembers.toString()} members
        </p>
      </div>
    </Link>
  );
}
