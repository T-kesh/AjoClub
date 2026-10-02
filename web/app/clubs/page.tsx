"use client";

import { useReadContract, useAccount } from "wagmi";
import { AJO_CLUB_ABI, AJO_CLUB_ADDRESS } from "@/lib/contract";
import { ClubCard } from "@/components/ClubCard";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useState, useMemo } from "react";

export default function ClubsPage() {
  const { address, isConnected } = useAccount();
  const [filter, setFilter] = useState<"All" | "Active" | "Open" | "My Clubs">("All");
  const [search, setSearch] = useState("");

  const { data: clubCount, isLoading } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "clubCount",
  });

  const ids = useMemo(() => {
    return clubCount !== undefined
      ? Array.from({ length: Number(clubCount) }, (_, i) => BigInt(i))
      : [];
  }, [clubCount]);

  return (
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="container-app py-10 flex-1">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">Community Savings</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B3D2E] dark:text-white">
              Browse Clubs
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Find an onchain circle on Base that fits your contribution and cycle.
            </p>
          </div>
          <Link href="/create" className="btn-green self-start sm:self-auto shadow-sm">
            + Create Club
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row items-stretch sm:items-center">
          <div className="flex-1 relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-10 text-sm"
              placeholder="Search clubs by name..."
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            {(["All", "Active", "Open", "My Clubs"] as const).map((tab) => {
              const active = filter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#0B3D2E] text-white dark:bg-[#22C55E] dark:text-[#0B2F28] shadow-sm"
                      : "bg-white text-slate-600 dark:bg-[#0B2F28] dark:text-slate-300 border border-slate-200/80 dark:border-[#164738] hover:bg-slate-50 dark:hover:bg-[#0F3B2F]"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Fetching circles from Base Sepolia…</p>
          </div>
        )}

        {/* My Clubs: wallet not connected */}
        {filter === "My Clubs" && !isConnected && (
          <div className="card text-center py-16 px-6 mt-8">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 dark:bg-[#071F17]/60 text-3xl mx-auto mb-4">
              🔌
            </div>
            <h3 className="text-lg font-bold text-[#0B3D2E] dark:text-white mb-1">
              Wallet Not Connected
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Connect your wallet using the button in the top right to see your clubs.
            </p>
          </div>
        )}

        {/* Empty state: no clubs on chain at all */}
        {!isLoading && ids.length === 0 && filter !== "My Clubs" && (
          <div className="card text-center py-16 px-6 mt-8">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-green-50 dark:bg-green-950/40 text-3xl mx-auto mb-4">
              🫙
            </div>
            <h3 className="text-lg font-bold text-[#0B3D2E] dark:text-white mb-1">
              No circles found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Be the first to create an onchain rotating savings circle on Base Sepolia.
            </p>
            <Link href="/create" className="btn-green px-5 py-2.5 text-sm">
              Start the First Club
            </Link>
          </div>
        )}

        {/* Clubs Grid */}
        {!isLoading && ids.length > 0 && !(filter === "My Clubs" && !isConnected) && (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ids.map((id) => (
              <ClubSummaryItem
                key={id.toString()}
                clubId={id}
                filter={filter}
                search={search}
                userAddress={address}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ClubSummaryItem({
  clubId,
  filter,
  search,
  userAddress,
}: {
  clubId: bigint;
  filter: "All" | "Active" | "Open" | "My Clubs";
  search: string;
  userAddress?: `0x${string}`;
}) {
  const { data } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getClub",
    args: [clubId],
  });

  if (!data) return null;
  const [name, token, contribution, cycleDuration, , maxMembers, , , status, members] = data;

  // Search query filter
  if (search.trim() && !name.toLowerCase().includes(search.toLowerCase().trim())) {
    return null;
  }

  // Tab filter
  if (filter === "Open" && status !== 0) return null;
  if (filter === "Active" && status !== 1) return null;
  if (filter === "My Clubs") {
    const isMember = userAddress && members.some((m: string) => m.toLowerCase() === userAddress.toLowerCase());
    if (!isMember) return null;
  }

  return (
    <ClubCard
      clubId={clubId}
      name={name}
      token={token}
      contribution={contribution}
      members={members}
      maxMembers={maxMembers}
      status={status}
      cycleDuration={cycleDuration}
    />
  );
}
