"use client";

import { SelfQRcodeWrapper } from "@selfxyz/qrcode";
import { buildSelfApp, getSelfEndpoint } from "@/lib/self";
import { getUniversalLink } from "@selfxyz/common/utils/appType";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";

interface Props {
  userAddress: string;
  onSuccess: () => void;
}

export function SelfVerifyButton({ userAddress, onSuccess }: Props) {
  const selfApp = buildSelfApp(userAddress);
  const [activeTab, setActiveTab] = useState<"live" | "direct">("live");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedTx, setVerifiedTx] = useState<{
    txHash?: string;
    basescanUrl?: string;
  } | null>(null);

  // Poll server for onchain verification status in case mobile app callback completed
  useEffect(() => {
    if (!userAddress || verifiedTx) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/verify/self?address=${userAddress}`);
        const data = await res.json();
        if (data.verified && isMounted) {
          clearInterval(interval);
          setVerifiedTx({
            basescanUrl: `https://sepolia.basescan.org/address/${userAddress}`,
          });
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } catch {
        // polling retry
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userAddress, verifiedTx, onSuccess]);

  async function handleInstantTestnetVerify() {
    if (!userAddress) return;
    setIsSubmitting(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/verify/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: userAddress,
          mode: "testnet_demo",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Verification attestation failed.");
      }

      setVerifiedTx({
        txHash: data.txHash,
        basescanUrl: data.basescanUrl,
      });

      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch (err: any) {
      setVerifyError(err?.message || "Failed to submit onchain verification.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (verifiedTx) {
    return (
      <div className="w-full rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-6 text-center animate-fade-in">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 grid place-items-center text-2xl mb-3">
          ✓
        </div>
        <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
          Identity Verified on Base Sepolia!
        </h3>
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-sm mx-auto">
          Your wallet has been attested onchain. You now have full permission to join and create rotating savings circles.
        </p>

        {verifiedTx.basescanUrl && (
          <a
            href={verifiedTx.basescanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            View on Basescan ↗
          </a>
        )}
      </div>
    );
  }

  const universalLink = selfApp ? getUniversalLink(selfApp) : "";

  return (
    <div className="flex flex-col items-center w-full">
      {/* Mode Selector Tabs (when app config is ready) */}
      {selfApp && (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "live"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Live WebSocket QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "direct"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Direct Universal Link QR
          </button>
        </div>
      )}

      {/* QR Code Container */}
      {selfApp ? (
        <div className="rounded-2xl overflow-hidden bg-white p-4 shadow-md ring-1 ring-slate-200 dark:ring-gray-700 flex flex-col items-center">
          {activeTab === "live" ? (
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={() => {
                setVerifiedTx({
                  basescanUrl: `https://sepolia.basescan.org/address/${userAddress}`,
                });
                setTimeout(onSuccess, 2000);
              }}
              onError={(err: any) => {
                setVerifyError(
                  err?.reason ??
                    err?.error_code ??
                    "Live connection issue. Switch to 'Direct Universal Link QR' tab above."
                );
              }}
              size={240}
            />
          ) : (
            <div className="p-2">
              <QRCodeSVG
                value={universalLink}
                size={240}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center w-full">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {userAddress ? "Preparing Proof Request…" : "Connect wallet to generate QR"}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {userAddress
              ? "Configuring Self Protocol zero-knowledge verification parameters."
              : "A valid wallet address is required to generate the Self Protocol proof request."}
          </p>
        </div>
      )}

      {/* QR Scan Instructions */}
      <div className="mt-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Scan with the <span className="font-semibold text-slate-700 dark:text-slate-200">Self mobile app</span> to generate a client-side ZK proof
        </p>
        <span className="text-[10px] text-slate-400 block mt-0.5">
          Relayer: {getSelfEndpoint()}
        </span>
      </div>

      {/* Testnet Instant Bypass / Demo Verification */}
      <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 w-full flex flex-col items-center">
        <div className="text-center mb-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Testnet Developer Fast Path
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Testing on Base Sepolia without a physical NFC e-Passport?
          </p>
        </div>

        <button
          type="button"
          onClick={handleInstantTestnetVerify}
          disabled={!userAddress || isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting Base Sepolia Attestation…
            </>
          ) : (
            <>
              <span>⚡</span> Verify with Testnet Passport Attestation
            </>
          )}
        </button>
      </div>

      {/* Error feedback */}
      {verifyError && (
        <div className="mt-4 w-full rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-center animate-fade-in">
          <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-0.5">
            Verification Notice
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">{verifyError}</p>
          <button
            onClick={() => setVerifyError(null)}
            className="mt-2 text-[11px] text-red-700 dark:text-red-400 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
