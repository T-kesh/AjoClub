"use client";
import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useGetClub } from "@/hooks/useAjoClub";
import { useContribute } from "@/hooks/useAjoClub";
import { tokenLabel } from "@/lib/contract";
import { useState } from "react";

export default function ContributePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const clubId = BigInt(id);
  const { data: club, isLoading } = useGetClub(clubId);
  const { contribute, isPending, isConfirming, isSuccess, error } = useContribute();
  const [done, setDone] = useState(false);

  if (isLoading || !club) {
    return <main className="p-6 text-center text-gray-400">Loading…</main>;
  }

  const [name, token, contribution] = club;

  async function handlePay() {
    try {
      await contribute(clubId);
      setDone(true);
    } catch {
      // surfaced via error
    }
  }

  if (done || isSuccess) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Contribution sent!</h1>
        <p className="text-sm text-gray-500 mb-8">Your payment has been recorded onchain.</p>
        <button
          onClick={() => router.push(`/club/${id}`)}
          className="px-6 py-3 rounded-2xl bg-green-500 text-white font-semibold"
        >
          Back to Club
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-6 flex flex-col items-center">
      <button onClick={() => router.back()} className="self-start text-sm text-gray-500 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="text-4xl mb-4">🫙</div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">{name}</h1>
      <p className="text-sm text-gray-500 mb-10">Your contribution this cycle</p>

      <div className="text-4xl font-bold text-green-600 mb-10">
        {formatUnits(contribution, 18)} {tokenLabel(token)}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4 w-full text-center">
          {(error as Error).message?.split("\n")[0] ?? "Transaction failed"}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={isPending || isConfirming}
        className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-xl transition-colors shadow"
      >
        {isPending ? "Confirm in wallet…" : isConfirming ? "Processing…" : "Pay Now"}
      </button>
    </main>
  );
}
