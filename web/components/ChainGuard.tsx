"use client";
import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/lib/contract";

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  8453: "Base Mainnet",
  84532: "Base Sepolia",
  42220: "Celo Mainnet",
  44787: "Alfajores Testnet",
  11142220: "Celo Sepolia",
};

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (isConnected && chainId && chainId !== CHAIN_ID) {
    const targetName = CHAIN_NAMES[CHAIN_ID] ?? `Chain ${CHAIN_ID}`;
    const currentName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0B3D2E]/60 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-5 text-center shadow-xl">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-bold">
            ⛓️
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Wrong Network Connected</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              AjoClub is running on <strong className="text-emerald-600 dark:text-emerald-400">{targetName}</strong>, but your wallet is currently connected to <strong>{currentName}</strong>.
            </p>
          </div>
          <button
            onClick={() => switchChain({ chainId: CHAIN_ID })}
            disabled={isPending}
            className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? "Switching..." : `Switch to ${targetName}`}
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
