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
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!selfApp) {
    return (
      <p className="text-sm text-gray-500 text-center">
        Self Protocol endpoint not configured.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Scan with the Self app to verify your identity. No personal data is shared.
      </p>
      <SelfQRcodeWrapper
        selfApp={selfApp}
        onSuccess={onSuccess}
        onError={(err) => {
          console.error("Self verification error:", err);
          setVerifyError(err?.reason ?? err?.error_code ?? "Verification failed. Please try again.");
        }}
        size={240}
      />
      {verifyError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 text-center max-w-xs">
          {verifyError}
        </p>
      )}
    </div>
  );
}
