"use client";
import { useChainId } from "wagmi";
import { CHAIN_ID } from "@/lib/contract";

const CHAIN_NAMES: Record<number, string> = {
  42220: "Celo Mainnet",
  44787: "Alfajores Testnet",
  11142220: "Celo Sepolia",
};

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const chainId = useChainId();
  if (chainId && chainId !== CHAIN_ID) {
    return (
      <div className="max-w-md mx-auto p-6 flex flex-col items-center gap-4 mt-12">
        <div className="text-4xl">⛓️</div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Wrong Network</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          AjoClub is running on <strong>{CHAIN_NAMES[CHAIN_ID] ?? `chain ${CHAIN_ID}`}</strong>.
          Your wallet is on <strong>{CHAIN_NAMES[chainId] ?? `chain ${chainId}`}</strong>.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
          In MiniPay, go to <strong>Settings → Developer Mode</strong> and switch to the correct network.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
