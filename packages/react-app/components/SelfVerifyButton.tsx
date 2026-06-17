"use client";
import { SelfQRcodeWrapper } from "@selfxyz/qrcode";
import { buildSelfApp } from "@/lib/self";
import { useState } from "react";

interface Props {
  userAddress: string;
  onSuccess: () => void;
}

export function SelfVerifyButton({ userAddress, onSuccess }: Props) {
  const selfApp = buildSelfApp(userAddress);
  const [scanning, setScanning] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!selfApp) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 text-center w-full">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification unavailable</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Self Protocol endpoint is not configured for this deployment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="rounded-2xl overflow-hidden dark:ring-1 dark:ring-gray-700">
        <SelfQRcodeWrapper
          selfApp={selfApp}
          onSuccess={() => { setScanning(false); onSuccess(); }}
          onError={(err) => {
            setScanning(false);
            setVerifyError(err?.reason ?? err?.error_code ?? "Verification failed. Please try again.");
          }}
          size={240}
        />
      </div>

      {scanning ? (
        <div className="flex items-center gap-2 mt-4 text-sm text-green-600 dark:text-green-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Waiting for Self app scan…
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
          Scan this QR code with the <span className="font-medium text-gray-500 dark:text-gray-400">Self app</span> to continue
        </p>
      )}

      {verifyError && (
        <div className="mt-4 w-full rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Verification failed</p>
          <p className="text-xs text-red-500 dark:text-red-500">{verifyError}</p>
          <button onClick={() => setVerifyError(null)} className="mt-2 text-xs text-red-600 dark:text-red-400 underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
