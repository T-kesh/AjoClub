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
    <main className="max-w-md mx-auto px-6 pt-6 pb-12 flex flex-col">
      <button
        onClick={() => router.back()}
        className="self-start text-sm text-gray-500 mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🪪</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Verify Your Identity</h1>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          AjoClub uses <span className="font-medium text-gray-700">Self Protocol</span> to confirm
          you&apos;re a real person before joining a club. It&apos;s private — no personal data
          leaves your phone.
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">How it works</p>

        <div className="flex gap-3 items-start">
          <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">1</span>
          <div>
            <p className="text-sm font-medium text-gray-800">Download the Self app</p>
            <p className="text-xs text-gray-500 mt-0.5">Available on iOS and Android</p>
            <div className="flex gap-2 mt-2">
              <a
                href="https://apps.apple.com/app/id6478563710"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-black text-white font-medium"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.proofofpassportapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-black text-white font-medium"
              >
                Google Play
              </a>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">2</span>
          <div>
            <p className="text-sm font-medium text-gray-800">Add your passport or national ID</p>
            <p className="text-xs text-gray-500 mt-0.5">Hold your document to your phone to scan the NFC chip</p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">3</span>
          <div>
            <p className="text-sm font-medium text-gray-800">Scan the QR code below</p>
            <p className="text-xs text-gray-500 mt-0.5">Open the Self app and tap the scan button</p>
          </div>
        </div>
      </div>

      {/* QR code */}
      <SelfVerifyButton userAddress={address ?? ""} onSuccess={onSuccess} />

      {/* Privacy note */}
      <p className="text-xs text-gray-400 text-center mt-6 max-w-xs mx-auto">
        Your identity is verified using a zero-knowledge proof. AjoClub never sees your document details — only that you&apos;re a unique real person.
      </p>
    </main>
  );
}
