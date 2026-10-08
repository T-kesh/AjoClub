"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { tokenLabel, tokenDecimals } from "@/lib/contract";
import { parseClubName } from "@/lib/clubIcons";

interface Props {
  clubId: bigint;
  name: string;
  token: `0x${string}`;
  contribution: bigint;
  members: readonly `0x${string}`[];
  maxMembers: bigint;
  status: number;
  cycleDuration?: bigint;
}

const STATUS_LABEL = ["Open", "Active", "Complete", "Cancelled"];
const STATUS_BADGE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
];

const avatars = ["🟢", "🟡", "🔵", "🟣", "🟠"];

export function ClubCard({
  clubId,
  name,
  token,
  contribution,
  members,
  maxMembers,
  status,
  cycleDuration,
}: Props) {
  const decimals = tokenDecimals(token);
  const symbol = tokenLabel(token);
  const cycleDays = cycleDuration ? Math.round(Number(cycleDuration) / 86400) : 14;
  const { icon, cleanName } = parseClubName(name, clubId);

  return (
    <div className="card p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(11,61,46,.10)] flex flex-col justify-between min-w-0 w-full overflow-hidden">
      <div className="min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-2xl bg-[#0B3D2E] text-lg sm:text-xl text-white shadow-sm shrink-0">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[#0B3D2E] dark:text-white text-sm sm:text-base leading-tight truncate" title={cleanName}>
                {cleanName}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                {members.length}/{maxMembers.toString()} members · {symbol}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold shrink-0 ${
              STATUS_BADGE[status] ?? STATUS_BADGE[2]
            }`}
          >
            {STATUS_LABEL[status] ?? "Unknown"}
          </span>
        </div>

        {/* Stats 2-col box */}
        <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3 rounded-2xl bg-slate-50 dark:bg-[#071F17]/60 p-3 sm:p-4 border border-slate-100/80 dark:border-[#164738]/60 min-w-0">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Contribution</p>
            <p className="mt-0.5 sm:mt-1 font-bold text-[#0B3D2E] dark:text-white text-xs sm:text-sm truncate">
              {formatUnits(contribution, decimals)} {symbol}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Cycle Cadence</p>
            <p className="mt-0.5 sm:mt-1 font-bold text-[#0B3D2E] dark:text-white text-xs sm:text-sm truncate">
              {cycleDays} days
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 sm:mt-5 flex items-center justify-between gap-2 pt-1 min-w-0">
        {/* Avatar stack */}
        <div className="flex -space-x-1.5 sm:-space-x-2 overflow-hidden items-center shrink-0">
          {avatars.slice(0, Math.min(members.length || 1, 4)).map((a, i) => (
            <div
              key={i}
              className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full border-2 border-white dark:border-[#0B2F28] bg-slate-100 dark:bg-[#071F17] text-[10px] sm:text-xs shadow-sm"
            >
              {a}
            </div>
          ))}
          {members.length > 4 && (
            <div className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full border-2 border-white dark:border-[#0B2F28] bg-slate-200 dark:bg-slate-700 text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-200">
              +{members.length - 4}
            </div>
          )}
        </div>

        <Link
          href={`/club/${clubId}`}
          className="btn-green !py-1.5 sm:!py-2 !px-3 sm:!px-4 !text-xs !font-bold shrink-0"
        >
          View Club →
        </Link>
      </div>
    </div>
  );
}

export default ClubCard;
