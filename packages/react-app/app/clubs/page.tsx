"use client";
import { useReadContract } from "wagmi";
import { AJO_CLUB_ABI, AJO_CLUB_ADDRESS } from "@/lib/contract";
import { ClubCard } from "@/components/ClubCard";
import Link from "next/link";

export default function ClubsPage() {
  // clubCount lets us iterate all clubs regardless of status
  const { data: clubCount, isLoading } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "clubCount",
  });

  const ids = clubCount !== undefined
    ? Array.from({ length: Number(clubCount) }, (_, i) => BigInt(i))
    : [];

  return (
    <main className="max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">All Clubs</h1>
        <Link href="/create">
          <button className="text-sm px-3 py-1.5 rounded-xl bg-green-500 text-white font-medium">
            + Create
          </button>
        </Link>
      </div>

      {isLoading && <p className="text-center text-gray-400 mt-10">Loading…</p>}

      {!isLoading && ids.length === 0 && (
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-4">No clubs yet.</p>
          <Link href="/create">
            <button className="px-5 py-2.5 rounded-2xl bg-green-500 text-white font-semibold">
              Start the first one
            </button>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ids.map((id) => <ClubSummary key={id.toString()} clubId={id} />)}
      </div>
    </main>
  );
}

function ClubSummary({ clubId }: { clubId: bigint }) {
  const { data } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getClub",
    args: [clubId],
  });
  if (!data) return null;
  const [name, token, contribution, , maxMembers, , , status, members] = data;
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
