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
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center w-full">
        <p className="text-sm font-medium text-gray-700 mb-1">Verification unavailable</p>
        <p className="text-xs text-gray-400">Self Protocol endpoint is not configured for this deployment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* QR code — SelfQRcodeWrapper handles the WebSocket + rendering */}
      <div className="relative">
        <SelfQRcodeWrapper
          selfApp={selfApp}
          onSuccess={() => {
            setScanning(false);
            onSuccess();
          }}
          onError={(err) => {
            setScanning(false);
            setVerifyError(
              err?.reason ?? err?.error_code ?? "Verification failed. Please try again."
            );
          }}
          size={240}
        />
      </div>

      {/* Status */}
      {scanning ? (
        <div className="flex items-center gap-2 mt-4 text-sm text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Waiting for Self app scan…
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Scan this QR code with the <span className="font-medium text-gray-500">Self app</span> to continue
        </p>
      )}

      {/* Error */}
      {verifyError && (
        <div className="mt-4 w-full rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-700 mb-1">Verification failed</p>
          <p className="text-xs text-red-500">{verifyError}</p>
          <button
            onClick={() => setVerifyError(null)}
            className="mt-2 text-xs text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
