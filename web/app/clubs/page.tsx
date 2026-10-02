"use client";

import { useReadContract } from "wagmi";
import { AJO_CLUB_ABI, AJO_CLUB_ADDRESS } from "@/lib/contract";
import { ClubCard } from "@/components/ClubCard";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useState } from "react";

export default function ClubsPage() {
  const [filter, setFilter] = useState<"all" | "open" | "active">("all");

  const { data: clubCount, isLoading } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "clubCount",
  });

  const ids =
    clubCount !== undefined
      ? Array.from({ length: Number(clubCount) }, (_, i) => BigInt(i))
      : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Savings Circles</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Explore active and open rotating savings circles on Base Sepolia
            </p>
          </div>

          <Link href="/create">
            <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm flex items-center gap-1.5">
              <span>+</span> Create Circle
            </button>
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Fetching circles from Base Sepolia…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && ids.length === 0 && (
          <div className="text-center py-16 px-4 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm mt-4">
            <span className="text-4xl block mb-3">🫙</span>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              No circles found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6">
              Be the first to create an onchain rotating savings circle on Base Sepolia.
            </p>
            <Link href="/create">
              <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow">
                Start the First Circle
              </button>
            </Link>
          </div>
        )}

        {/* List of circles */}
        {!isLoading && ids.length > 0 && (
          <div className="flex flex-col gap-3.5">
            {ids.map((id) => (
              <ClubSummary key={id.toString()} clubId={id} filter={filter} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ClubSummary({
  clubId,
  filter,
}: {
  clubId: bigint;
  filter: "all" | "open" | "active";
}) {
  const { data } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getClub",
    args: [clubId],
  });

  if (!data) return null;
  const [name, token, contribution, , , maxMembers, , , status, members] = data;

  if (filter === "open" && status !== 0) return null;
  if (filter === "active" && status !== 1) return null;

  return (
    <ClubCard
      clubId={clubId}
      name={name}
      token={token}
      contribution={contribution}
      members={members}
      maxMembers={maxMembers}
      status={status}
    />
  );
}
