"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { SelfVerifyButton } from "@/components/SelfVerifyButton";
import { useMiniPay } from "@/hooks/useMiniPay";

export default function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/";
  const { address } = useMiniPay();

  function onSuccess() {
    router.push(returnTo);
  }

  return (
    <main className="max-w-md mx-auto p-6 flex flex-col items-center">
      <button onClick={() => router.back()} className="self-start text-sm text-gray-500 mb-6 flex items-center gap-1">
        ← Back
      </button>
      <div className="text-4xl mb-4">🪪</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">Verify Your Identity</h1>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
        AjoClub requires a one-time identity check via Self Protocol before you can join any club.
        No personal data is stored onchain.
      </p>
      <SelfVerifyButton userAddress={address ?? ""} onSuccess={onSuccess} />
    </main>
  );
}
