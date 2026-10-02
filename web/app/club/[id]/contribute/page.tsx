"use client";

import { useParams, useRouter } from "next/navigation";
import { formatUnits, encodeFunctionData } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useSendCalls, useCallsStatus } from "wagmi/experimental";
import { waitForTransactionReceipt } from "@/lib/wagmi";
import { useGetClub, useContribute } from "@/hooks/useAjoClub";
import { AJO_CLUB_ADDRESS, AJO_CLUB_ABI, tokenLabel, tokenDecimals } from "@/lib/contract";
import { friendlyError } from "@/lib/errors";
import { Navbar } from "@/components/Navbar";
import { useState, useMemo } from "react";
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
  if (step === "gasless_sending" && callsStatus?.status === "CONFIRMED") {
    const receiptHash = callsStatus.receipts?.[0]?.transactionHash;
    if (receiptHash && receiptHash !== txHash) {
      setTxHash(receiptHash);
      setStep("done");
    }
  }

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="max-w-md mx-auto p-6 text-center text-gray-400 dark:text-gray-500 pt-20">
          Loading circle details…
        </main>
      </div>
    );
  }

  const [name, token, contribution] = club;
  const decimals = tokenDecimals(token);
  const needsApprove = allowance === undefined || allowance < contribution;
  const isSmartWallet = connector?.id === "coinbaseWalletSDK" || connector?.name?.toLowerCase().includes("coinbase");

  // Handler for Gasless 1-Tap contribution via Paymaster (ERC-5792)
  async function handleGaslessPay() {
    if (!paymasterUrl) {
      // Fallback if paymaster is unconfigured
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
      console.warn("Gasless sendCalls failed or unsupported, falling back to standard flow:", e);
      // If user rejected or method not supported, attempt standard flow or show error
      const msg = (e as Error)?.message || "";
      if (msg.includes("rejected") || msg.includes("User denied")) {
        setError("Transaction cancelled by user.");
        setStep("idle");
      } else {
        // Fallback to standard flow
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <main className="max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center pt-16">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 flex items-center justify-center text-3xl mb-4 shadow-sm">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contribution Recorded!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
            Your {formatUnits(contribution, decimals)} {tokenLabel(token)} deposit has been verified onchain.
          </p>

          {txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-blue-600 dark:text-blue-400 underline mb-8 block hover:text-blue-700"
            >
              View on Basescan ↗
            </a>
          )}

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push(`/club/${id}`)}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-colors"
            >
              Back to Circle
            </button>
            <Link
              href="/clubs"
              className="w-full py-3 rounded-2xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm text-center hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              Browse Other Circles
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isBusy = step === "gasless_sending" || step === "approving" || step === "contributing";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="max-w-md mx-auto p-6 flex flex-col items-center">
        <button
          onClick={() => router.back()}
          className="self-start text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          ← Back to Circle
        </button>

        {/* Card */}
        <div className="w-full rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col items-center text-center">
          <div className="text-4xl mb-3">🫙</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{name}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-6">
            Cycle Contribution
          </p>

          <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-2">
            {formatUnits(contribution, decimals)} {tokenLabel(token)}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            USDC on Base Sepolia · 6 Decimals
          </p>

          {/* Paymaster Sponsorship Banner */}
          {paymasterUrl && (
            <div className="w-full rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-200 dark:border-blue-800/60 p-3 mb-6 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚡</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    Paymaster Sponsored
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    0 gas fees · Batched approve + contribute in 1 tap
                  </span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                Gasless
              </span>
            </div>
          )}

          {/* Wallet check */}
          {!isConnected ? (
            <div className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wallet Not Connected
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Please connect your Smart Wallet or injected wallet using the button at the top right.
              </p>
            </div>
          ) : (
            <>
              {(error || contributeError) && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl p-3 mb-4 w-full text-center border border-red-100 dark:border-red-900">
                  {error ?? (contributeError ? friendlyError(contributeError as Error) : "Transaction failed")}
                </div>
              )}

              {/* Action buttons */}
              {paymasterUrl ? (
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={handleGaslessPay}
                    disabled={isBusy}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-base transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {step === "gasless_sending" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing Gasless Contribution…
                      </>
                    ) : (
                      <>
                        <span>⚡</span> One-Tap Gasless Pay ({formatUnits(contribution, decimals)} USDC)
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleStandardPay}
                    disabled={isBusy}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1 transition-colors underline"
                  >
                    {needsApprove ? "Use standard 2-step wallet flow instead" : "Use standard wallet transfer"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStandardPay}
                  disabled={isBusy}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-lg transition-colors shadow"
                >
                  {step === "approving"
                    ? "Approving USDC Spend…"
                    : step === "contributing"
                    ? "Sending Contribution…"
                    : `Pay ${formatUnits(contribution, decimals)} USDC`}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
