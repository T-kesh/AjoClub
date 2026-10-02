"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits, decodeEventLog } from "viem";
import { useCreateClub } from "@/hooks/useAjoClub";
import { SUPPORTED_TOKENS, AJO_CLUB_ABI, tokenDecimals, tokenLabel } from "@/lib/contract";
import { waitForTransactionReceipt } from "@/lib/wagmi";
import { friendlyError } from "@/lib/errors";
import { Navbar } from "@/components/Navbar";
import { useAccount } from "wagmi";
import Link from "next/link";

const CYCLE_OPTIONS = [
  { label: "7 days (Weekly)", value: 7 * 24 * 3600 },
  { label: "14 days (Bi-weekly)", value: 14 * 24 * 3600 },
  { label: "30 days (Monthly)", value: 30 * 24 * 3600 },
];

const inputCls =
  "w-full border border-gray-300 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";

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
  const [maxMembers, setMaxMembers] = useState("3");

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        <Link
          href="/clubs"
          className="text-xs text-gray-500 dark:text-gray-400 mb-6 inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          ← Back to circles
        </Link>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🫙</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Create a Savings Circle
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Deploy a new onchain ROSCA circle on Base Sepolia
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Circle Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Base Builders Circle"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Currency
              </label>
              <select
                value={token}
                onChange={(e) => setToken(e.target.value as `0x${string}`)}
                className={inputCls}
              >
                {Object.entries(SUPPORTED_TOKENS).map(([label, addr]) => (
                  <option key={addr} value={addr}>
                    {label} ({tokenLabel(addr)}) · Base Sepolia
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
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
                  className={inputCls}
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                  USDC
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Cycle Duration
              </label>
              <select
                value={cycle}
                onChange={(e) => setCycle(Number(e.target.value))}
                className={inputCls}
              >
                {CYCLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Circle Size (Max Members)
              </label>
              <input
                required
                type="number"
                min="2"
                max="30"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className={inputCls}
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                Total pot size will be: {parseInt(maxMembers, 10) * (parseFloat(amount) || 0) || 0} USDC per round
              </p>
            </div>

            {displayError && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-xs text-red-700 dark:text-red-300 text-center">
                {displayError}
              </div>
            )}

            {!isConnected ? (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
                Connect your wallet at the top right to deploy this circle.
              </p>
            ) : (
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 mt-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming in Wallet…
                  </>
                ) : isConfirming ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deploying Circle on Base Sepolia…
                  </>
                ) : (
                  "Create Circle"
                )}
              </button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
