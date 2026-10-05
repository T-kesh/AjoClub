"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits, decodeEventLog } from "viem";
import { useCreateClub } from "@/hooks/useAjoClub";
import { SUPPORTED_TOKENS, AJO_CLUB_ABI, tokenDecimals, tokenLabel } from "@/lib/contract";
import { waitForTransactionReceipt } from "@/lib/wagmi";
import { friendlyError } from "@/lib/errors";
import { Navbar } from "@/components/Navbar";
import { TestnetHelper } from "@/components/TestnetHelper";
import { useAccount } from "wagmi";
import Link from "next/link";

const CYCLE_OPTIONS = [
  { label: "7 days (Weekly)", value: 7 * 24 * 3600 },
  { label: "14 days (Bi-weekly)", value: 14 * 24 * 3600 },
  { label: "30 days (Monthly)", value: 30 * 24 * 3600 },
];

export default function CreateClubPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createClub, isPending, error: txError } = useCreateClub();
  const [isConfirming, setIsConfirming] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const defaultToken = Object.values(SUPPORTED_TOKENS)[0];
  const [name, setName] = useState("");
  const [token, setToken] = useState(defaultToken);
  const [amount, setAmount] = useState("50");
  const [cycle, setCycle] = useState(CYCLE_OPTIONS[0].value);
  const [maxMembers, setMaxMembers] = useState("5");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setValidationError("Contribution must be greater than 0.");
      return;
    }
    if (parsed < 1) {
      setValidationError("Minimum contribution is 1 USDC.");
      return;
    }
    if (parsed > 100000) {
      setValidationError("Maximum contribution is 100,000 USDC per cycle.");
      return;
    }

    const membersCount = parseInt(maxMembers, 10);
    if (isNaN(membersCount) || membersCount < 2 || membersCount > 30) {
      setValidationError("Circle must have between 2 and 30 members.");
      return;
    }

    try {
      const decimals = tokenDecimals(token);
      const gracePeriod = 24 * 3600; // 24 hours default grace period
      const hash = await createClub(
        name,
        token,
        parseUnits(amount, decimals),
        BigInt(cycle),
        BigInt(gracePeriod),
        BigInt(membersCount)
      );
      setIsConfirming(true);
      const receipt = await waitForTransactionReceipt({ hash });
      let createdClubId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: AJO_CLUB_ABI,
            eventName: "ClubCreated",
            data: log.data,
            topics: log.topics,
          });
          createdClubId = decoded.args.clubId;
          break;
        } catch {}
      }
      router.push(createdClubId !== undefined ? `/club/${createdClubId}` : "/clubs");
    } catch {
      // Handled via txError
    } finally {
      setIsConfirming(false);
    }
  }

  const displayError =
    validationError ?? (txError ? friendlyError(txError as Error) : null);

  const busy = isPending || isConfirming;
  const potPreview = (parseInt(maxMembers, 10) || 0) * (parseFloat(amount) || 0);

  return (
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="container-app py-10 flex-1">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/clubs"
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B3D2E] dark:hover:text-white inline-flex items-center gap-1.5 transition-colors mb-4"
          >
            ← Back to clubs
          </Link>

          <div>
            <span className="eyebrow">Set up your savings circle</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B3D2E] dark:text-white">
              Create Club
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose the rules once. The smart contract handles the rotation.
            </p>
          </div>

          <TestnetHelper variant="banner" className="mt-6" />

          <div className="card mt-6 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Club Name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dream Builders"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Token
                </label>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value as `0x${string}`)}
                  className="input font-semibold"
                >
                  {Object.entries(SUPPORTED_TOKENS).map(([label, addr]) => (
                    <option key={addr} value={addr}>
                      {label} ({tokenLabel(addr)}) · Base Sepolia (6 Decimals)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Contribution Amount (per member, per cycle)
                </label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50"
                    className="input font-bold pr-16"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                    USDC
                  </span>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Cycle Duration
                  </label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(Number(e.target.value))}
                    className="input"
                  >
                    {CYCLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Max Members
                  </label>
                  <select
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="input"
                  >
                    {["3", "5", "8", "10", "12", "15", "20"].map((n) => (
                      <option key={n} value={n}>
                        {n} members
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pot preview box */}
              <div className="rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 p-4 text-xs font-semibold text-green-900 dark:text-green-200 flex items-center justify-between">
                <span>Total Pot per Round:</span>
                <span className="text-base font-extrabold text-[#0B7A4B] dark:text-[#22C55E]">
                  {potPreview} USDC
                </span>
              </div>

              {displayError && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-xs text-red-700 dark:text-red-300 text-center font-semibold space-y-2">
                  <p>{displayError}</p>
                  {/ETH|gas|network fee|faucet/i.test(displayError) && (
                    <a
                      href="https://faucet.base.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm transition-all"
                    >
                      Claim Free Base Sepolia ETH at Faucet ↗
                    </a>
                  )}
                </div>
              )}

              {!isConnected ? (
                <p className="text-center text-xs text-slate-500 py-2">
                  Connect your wallet at the top right to deploy this circle.
                </p>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-green w-full !py-4 text-base font-bold shadow-md flex items-center justify-center gap-2 mt-4"
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0B3D2E] border-t-transparent rounded-full animate-spin" />
                      Confirming in Wallet…
                    </>
                  ) : isConfirming ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0B3D2E] border-t-transparent rounded-full animate-spin" />
                      Deploying Circle on Base Sepolia…
                    </>
                  ) : (
                    "Create Club on Base →"
                  )}
                </button>
              )}

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                💡 <span className="font-semibold">Zero USDC deducted to create.</span> Only a standard testnet gas fee (~0.0001 Base Sepolia ETH) is required by MetaMask to register the circle rules.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
