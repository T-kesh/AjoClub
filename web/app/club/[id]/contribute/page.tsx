"use client";

import { useParams, useRouter } from "next/navigation";
import { formatUnits, encodeFunctionData } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useSendCalls, useCallsStatus } from "wagmi/experimental";
import { waitForTransactionReceipt } from "@/lib/wagmi";
import { useGetClub, useContribute } from "@/hooks/useAjoClub";
import { AJO_CLUB_ADDRESS, AJO_CLUB_ABI, tokenLabel, tokenDecimals, CHAIN_ID } from "@/lib/contract";
import { friendlyError } from "@/lib/errors";
import { Navbar } from "@/components/Navbar";
import { TestnetHelper } from "@/components/TestnetHelper";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type Step = "idle" | "gasless_sending" | "approving" | "contributing" | "done";

export default function ContributePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const clubId = BigInt(id);

  const { address, isConnected, connector } = useAccount();
  const { data: club, isLoading } = useGetClub(clubId);
  const { contribute: writeContribute, error: contributeError } = useContribute();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Paymaster configuration
  const cdpKey =
    process.env.NEXT_PUBLIC_CDP_API_KEY ||
    process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;

  const paymasterUrl = useMemo(() => {
    return cdpKey
      ? `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${cdpKey}`
      : undefined;
  }, [cdpKey]);

  // ERC-5792 batched calls hook
  const { sendCallsAsync, data: callsId } = useSendCalls();

  // Watch calls status if callsId is present
  const { data: callsStatus } = useCallsStatus({
    id: callsId ?? "",
    query: {
      enabled: !!callsId && step === "gasless_sending",
      refetchInterval: (query: { state: { data?: { status?: string } } }) =>
        query.state.data?.status === "CONFIRMED" ? false : 1000,
    },
  });

  // When batched call confirms
  useEffect(() => {
    if (step === "gasless_sending" && callsStatus?.status === "CONFIRMED") {
      const receiptHash = callsStatus.receipts?.[0]?.transactionHash;
      if (receiptHash && receiptHash !== txHash) {
        setTxHash(receiptHash);
        setStep("done");
      }
    }
  }, [step, callsStatus, txHash]);

  // Read current allowance for standard fallback
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: club?.[1] as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && club ? [address, AJO_CLUB_ADDRESS] : undefined,
    query: { enabled: !!address && !!club },
  });

  if (isLoading || !club) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17]">
        <Navbar />
        <main className="container-app py-20 text-center flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-500">Loading contribution details…</p>
        </main>
      </div>
    );
  }

  const [name, token, contribution] = club;
  const decimals = tokenDecimals(token);
  const symbol = tokenLabel(token);
  const formattedAmount = formatUnits(contribution, decimals);
  const needsApprove = allowance === undefined || allowance < contribution;

  // Handler for Gasless 1-Tap contribution via Paymaster (ERC-5792)
  async function handleGaslessPay() {
    if (!paymasterUrl) {
      return handleStandardPay();
    }
    setError(null);
    setStep("gasless_sending");

    try {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AJO_CLUB_ADDRESS, contribution],
      });

      const contributeData = encodeFunctionData({
        abi: AJO_CLUB_ABI,
        functionName: "contribute",
        args: [clubId],
      });

      await sendCallsAsync({
        calls: [
          {
            to: token as `0x${string}`,
            data: approveData,
          },
          {
            to: AJO_CLUB_ADDRESS,
            data: contributeData,
          },
        ],
        capabilities: {
          paymasterService: {
            url: paymasterUrl,
          },
        },
      });
    } catch (e: unknown) {
      console.warn("Gasless sendCalls failed, attempting standard flow:", e);
      const msg = (e as Error)?.message || "";
      if (msg.includes("rejected") || msg.includes("User denied")) {
        setError("Transaction cancelled by user.");
        setStep("idle");
      } else {
        return handleStandardPay();
      }
    }
  }

  // Handler for standard fallback (2-step Approve -> Contribute)
  async function handleStandardPay() {
    setError(null);
    try {
      if (needsApprove) {
        setStep("approving");
        const approveTx = await writeContractAsync({
          chainId: CHAIN_ID,
          address: token as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [AJO_CLUB_ADDRESS, contribution],
        });
        await waitForTransactionReceipt({ hash: approveTx });
        await refetchAllowance();
      }

      setStep("contributing");
      const hash = await writeContribute(clubId);
      await waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setStep("done");
    } catch (e) {
      setError(friendlyError(e as Error));
      setStep("idle");
    }
  }

  // Success view
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17]">
        <Navbar />
        <main className="container-app py-16 flex flex-col items-center justify-center text-center">
          <div className="card p-8 sm:p-10 max-w-md w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/60 text-[#22C55E] flex items-center justify-center text-3xl mb-4 shadow-sm">
              ✓
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B3D2E] dark:text-white mb-2">
              Contribution Sent!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Your {formattedAmount} {symbol} contribution has been recorded on Base Sepolia.
            </p>

            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#0B7A4B] dark:text-[#22C55E] underline mb-8 block"
              >
                View on Basescan ↗
              </a>
            )}

            <button
              onClick={() => router.push(`/club/${id}`)}
              className="btn-green w-full py-3.5 text-base font-bold shadow-md"
            >
              Back to Club Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isBusy = step === "gasless_sending" || step === "approving" || step === "contributing";

  return (
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="container-app py-10 flex-1">
        <div className="mx-auto max-w-xl">
          <Link
            href={`/club/${id}`}
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B3D2E] dark:hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            ← Back to club
          </Link>

          <TestnetHelper
            variant="banner"
            className="mt-4"
            requiredAmount={formattedAmount}
          />

          {/* Card matching mockup */}
          <div className="card mt-4 p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0B3D2E] text-2xl text-white shadow-sm shrink-0">
                🫙
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#0B3D2E] dark:text-white">
                  Contribute
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {name} · {symbol} · {formattedAmount} {symbol}
                </p>
              </div>
            </div>

            {/* Contribution Amount Field */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Contribution Amount
              </label>
              <div className="relative">
                <input
                  className="input text-xl font-extrabold !text-[#0B3D2E] dark:!text-white pr-16"
                  value={formattedAmount}
                  readOnly
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                  {symbol}
                </span>
              </div>
            </div>

            {/* Quick amounts indicator pills */}
            <div className="mt-3 flex gap-2 mb-6">
              {["10", "25", "50", "100"].map((amt) => {
                const isSelected = formattedAmount === amt;
                return (
                  <div
                    key={amt}
                    className={`flex-1 rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                      isSelected
                        ? "border-[#22C55E] bg-green-50 dark:bg-green-950/40 text-[#0B7A4B] dark:text-green-300 shadow-sm"
                        : "border-slate-200 dark:border-[#164738] bg-white dark:bg-[#071F17] text-slate-400"
                    }`}
                  >
                    ${amt}
                  </div>
                );
              })}
            </div>

            {/* Token Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Token
              </label>
              <select className="input text-sm font-semibold" value={token} disabled>
                <option value={token}>
                  {symbol} (Base Sepolia · 6 Decimals)
                </option>
              </select>
            </div>

            {/* Error prompt */}
            {(error || contributeError) && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 mb-5 text-xs font-semibold text-red-700 dark:text-red-300 text-center">
                {error ?? (contributeError ? friendlyError(contributeError as Error) : "Transaction failed")}
              </div>
            )}

            {/* Action Button */}
            {!isConnected ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071F17]/60 border border-slate-200 dark:border-[#164738] text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Connect your wallet at the top right to make this contribution.
                </p>
              </div>
            ) : paymasterUrl ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleGaslessPay}
                  disabled={isBusy}
                  className="btn-green w-full !py-4 text-base font-bold shadow-md flex items-center justify-center gap-2"
                >
                  {step === "gasless_sending" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0B3D2E] border-t-transparent rounded-full animate-spin" />
                      Sponsoring Gasless Contribution…
                    </>
                  ) : (
                    <>
                      <span>⚡</span> Approve & Contribute (Gasless 1-Tap)
                    </>
                  )}
                </button>

                <button
                  onClick={handleStandardPay}
                  disabled={isBusy}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline py-1 text-center"
                >
                  {needsApprove
                    ? "Or use standard 2-step wallet flow (Approve then Send)"
                    : "Or send with standard wallet transfer"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleStandardPay}
                disabled={isBusy}
                className="btn-green w-full !py-4 text-base font-bold shadow-md"
              >
                {step === "approving"
                  ? "Approving USDC Spend…"
                  : step === "contributing"
                  ? "Sending Contribution…"
                  : `Approve & Contribute (${formattedAmount} ${symbol})`}
              </button>
            )}

            {/* Trust badge matching design */}
            <div className="mt-6 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 p-4 text-xs font-semibold text-green-800 dark:text-green-300 flex items-center gap-2.5">
              <span className="text-base text-[#22C55E]">✓</span>
              <span>Secure, on-chain. Powered by Base Sepolia and CDP Paymaster.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
