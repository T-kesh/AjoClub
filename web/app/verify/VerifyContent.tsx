"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SelfVerifyButton } from "@/components/SelfVerifyButton";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export default function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/clubs";
  const { address } = useAccount();

  function onSuccess() {
    router.push(returnTo);
  }

  return (
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="container-app py-10 flex-1 flex flex-col items-center">
        <div className="w-full max-w-lg">
          <Link
            href={returnTo}
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#0B3D2E] dark:hover:text-white inline-flex items-center gap-1.5 transition-colors mb-4"
          >
            ← Back
          </Link>

          <div className="card p-6 sm:p-8 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-green-50 dark:bg-green-950/40 text-4xl mb-4 shadow-sm">
              🛡️
            </div>
            <span className="eyebrow">Identity Gate</span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#0B3D2E] dark:text-white">
              Verify with Self Protocol
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Prove your identity with a ZK passport proof before joining a club. Your personal data stays private.
            </p>

            <div className="mt-6 space-y-2.5 text-left text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              {[
                "Government ID & biometric NFC verification",
                "Zero-knowledge proof (no data leaves your phone)",
                "One passport equals one unique member identity",
              ].map((x) => (
                <div
                  key={x}
                  className="rounded-2xl bg-slate-50 dark:bg-[#071F17]/60 p-3.5 border border-slate-100 dark:border-[#164738]/60 flex items-center gap-2.5"
                >
                  <span className="text-[#22C55E] font-bold">✓</span> {x}
                </div>
              ))}
            </div>

            {/* QR Code Scan Area */}
            <div className="mt-7 flex flex-col items-center">
              <SelfVerifyButton userAddress={address ?? ""} onSuccess={onSuccess} />
            </div>

            <p className="mt-6 text-[11px] text-slate-400 text-center max-w-xs mx-auto">
              Your identity is verified onchain. AjoClub never sees your document details.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
