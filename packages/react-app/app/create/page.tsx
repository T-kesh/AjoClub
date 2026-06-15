"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits, decodeEventLog } from "viem";
import { useCreateClub } from "@/hooks/useAjoClub";
import { SUPPORTED_TOKENS, AJO_CLUB_ABI } from "@/lib/contract";
import { waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/lib/celo";

const CYCLE_OPTIONS = [
  { label: "7 days", value: 7 * 24 * 3600 },
  { label: "14 days", value: 14 * 24 * 3600 },
  { label: "30 days", value: 30 * 24 * 3600 },
];

export default function CreateClubPage() {
  const router = useRouter();
  const { createClub, isPending, error } = useCreateClub();
  const [isConfirming, setIsConfirming] = useState(false);

  const [name, setName] = useState("");
  const [token, setToken] = useState(Object.values(SUPPORTED_TOKENS)[0]);
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState(CYCLE_OPTIONS[0].value);
  const [maxMembers, setMaxMembers] = useState("5");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const hash = await createClub(
        name,
        token,
        parseUnits(amount, 18),
        BigInt(cycle),
        BigInt(Math.max(2, parseInt(maxMembers, 10) || 2))
      );

      setIsConfirming(true);
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });

      // Decode ClubCreated event to get the new clubId
      let clubId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: AJO_CLUB_ABI,
            eventName: "ClubCreated",
            data: log.data,
            topics: log.topics,
          });
          clubId = decoded.args.clubId;
          break;
        } catch {}
      }

      if (clubId !== undefined) {
        router.push(`/club/${clubId}`);
      } else {
        router.push("/clubs");
      }
    } catch {
      // error surfaced via hook
    } finally {
      setIsConfirming(false);
    }
  }

  const busy = isPending || isConfirming;

  return (
    <main className="max-w-md mx-auto p-6">
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        ← Back
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Create a Club</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sunday Circle"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value as `0x${string}`)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          >
            {Object.entries(SUPPORTED_TOKENS).map(([label, addr]) => (
              <option key={addr} value={addr}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contribution per Cycle</label>
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5.00"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Duration</label>
          <select
            value={cycle}
            onChange={(e) => setCycle(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          >
            {CYCLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxMembers}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setMaxMembers(raw === "" ? "" : String(parseInt(raw, 10)));
            }}
            onBlur={() => {
              const n = parseInt(maxMembers, 10);
              if (!n || n < 2) setMaxMembers("2");
              else if (n > 20) setMaxMembers("20");
            }}
            placeholder="2–20"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
            {(error as Error).message?.split("\n")[0] ?? "Transaction failed"}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-lg transition-colors shadow"
        >
          {isPending ? "Confirm in wallet…" : isConfirming ? "Creating…" : "Create Club"}
        </button>
      </form>
    </main>
  );
}
