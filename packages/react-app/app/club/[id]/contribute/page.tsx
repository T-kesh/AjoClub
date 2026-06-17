"use client";
import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "@/lib/celo";
import { useGetClub, useContribute } from "@/hooks/useAjoClub";
import { useMiniPay } from "@/hooks/useMiniPay";
import { AJO_CLUB_ADDRESS, tokenLabel } from "@/lib/contract";
import { useState } from "react";

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

type Step = "idle" | "approving" | "contributing" | "done";

export default function ContributePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const clubId = BigInt(id);

  const { data: club, isLoading } = useGetClub(clubId);
  const { contribute, error: contributeError } = useContribute();
  const { writeContractAsync } = useWriteContract();
  const { address } = useMiniPay();

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  // Read current allowance so we can skip approve if already sufficient
  const { data: allowance } = useReadContract({
    address: club?.[1] as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && club ? [address, AJO_CLUB_ADDRESS] : undefined,
    query: { enabled: !!address && !!club },
  });

  if (isLoading || !club) {
    return <main className="p-6 text-center text-gray-400 dark:text-gray-500">Loading…</main>;
  }

  const [name, token, contribution] = club;
  const needsApprove = allowance === undefined || allowance < contribution;

  async function handlePay() {
    setError(null);
    try {
      // Step 1 — ERC20 approve (skip if allowance already covers contribution)
      if (needsApprove) {
        setStep("approving");
        const approveTx = await writeContractAsync({
          address: token as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          type: "legacy",
          args: [AJO_CLUB_ADDRESS, contribution],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
      }

      // Step 2 — contribute
      setStep("contributing");
      const hash = await contribute(clubId);
      await waitForTransactionReceipt(wagmiConfig, { hash });
      setStep("done");
    } catch (e) {
      setError((e as Error).message?.split("\n")[0] ?? "Transaction failed");
      setStep("idle");
    }
  }

  if (step === "done") {
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

  const isBusy = step === "approving" || step === "contributing";
  const buttonLabel =
    step === "approving" ? "Approving spend…" :
    step === "contributing" ? "Sending contribution…" :
    "Pay Now";

  return (
    <main className="max-w-md mx-auto p-6 flex flex-col items-center">
      <button onClick={() => router.back()} className="self-start text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="text-4xl mb-4">🫙</div>
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Your contribution this cycle</p>

      <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-4">
        {formatUnits(contribution, 18)} {tokenLabel(token)}
      </div>

      {needsApprove && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-10 text-center">
          Requires 2 wallet confirmations: approve spend, then send.
        </p>
      )}

      {(error || contributeError) && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl p-3 mb-4 w-full text-center">
          {error ?? (contributeError as Error).message?.split("\n")[0] ?? "Transaction failed"}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={isBusy}
        className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-xl transition-colors shadow"
      >
        {buttonLabel}
      </button>
    </main>
  );
}
