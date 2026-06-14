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
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-gray-100 text-gray-500",
];

export function ClubCard({ clubId, name, token, contribution, members, maxMembers, status }: Props) {
  return (
    <Link href={`/club/${clubId}`}>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {formatUnits(contribution, 18)} {tokenLabel(token)} per cycle
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {members.length} / {maxMembers.toString()} members
        </p>
      </div>
    </Link>
  );
}
