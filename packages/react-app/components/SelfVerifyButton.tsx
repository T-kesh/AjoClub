"use client";
import { SelfQRcodeWrapper } from "@selfxyz/qrcode";
import { buildSelfApp } from "@/lib/self";

interface Props {
  userAddress: string;
  onSuccess: () => void;
}

export function SelfVerifyButton({ userAddress, onSuccess }: Props) {
  const selfApp = buildSelfApp(userAddress);

  if (!selfApp) {
    return (
      <p className="text-sm text-gray-500 text-center">
        Self Protocol endpoint not configured or wallet not connected.
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
        onError={(err) => console.error("Self verification error:", err)}
        size={240}
      />
    </div>
  );
}
