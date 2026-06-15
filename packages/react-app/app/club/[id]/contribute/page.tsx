"use client";
import { useParams, useRouter } from "next/navigation";
import { formatUnits } from "viem";
import { useGetClub } from "@/hooks/useAjoClub";
import { useContribute } from "@/hooks/useAjoClub";
import { AJO_CLUB_ADDRESS, tokenLabel } from "@/lib/contract";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
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
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !club) {
    return <main className="p-6 text-center text-gray-400">Loading…</main>;
  }

  const [name, token, contribution] = club;

  async function handlePay() {
    setError(null);
    try {
      // Step 1 — ERC20 approve
      setStep("approving");
      const approveTx = await writeContractAsync({
        address: token as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        type: "legacy",
        args: [AJO_CLUB_ADDRESS, contribution],
      });
      setApproveTxHash(approveTx);

      // Wait for approval confirmation before contributing
      // useWaitForTransactionReceipt handles this reactively, but for sequential
      // flow in an async function we import waitForTransactionReceipt directly
      const { waitForTransactionReceipt } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/lib/celo");
      await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });

      // Step 2 — contribute
      setStep("contributing");
      await contribute(clubId);
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
      <button onClick={() => router.back()} className="self-start text-sm text-gray-500 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="text-4xl mb-4">🫙</div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">{name}</h1>
      <p className="text-sm text-gray-500 mb-10">Your contribution this cycle</p>

      <div className="text-4xl font-bold text-green-600 mb-4">
        {formatUnits(contribution, 18)} {tokenLabel(token)}
      </div>

      <p className="text-xs text-gray-400 mb-10 text-center">
        This requires 2 wallet confirmations: approve spend, then send.
      </p>

      {(error || contributeError) && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4 w-full text-center">
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
