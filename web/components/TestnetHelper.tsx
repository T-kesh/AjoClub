"use client";

import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { IS_TESTNET, TOKENS, tokenDecimals } from "@/lib/contract";
import { useTokenBalance } from "@/hooks/useTokenBalance";

interface TestnetHelperProps {
  variant?: "card" | "compact" | "banner";
  className?: string;
  requiredAmount?: string; // e.g. "50" USDC
}

export function TestnetHelper({
  variant = "card",
  className = "",
  requiredAmount,
}: TestnetHelperProps) {
  const { address } = useAccount();
  const [copiedToken, setCopiedToken] = useState(false);
  const [addedToWallet, setAddedToWallet] = useState(false);

  // Base Sepolia USDC address
  const usdcAddress = TOKENS.baseSepolia.USDC;
  const decimals = tokenDecimals(usdcAddress);

  // Balances
  const { data: rawBalance, isLoading: isUsdcLoading } = useTokenBalance(usdcAddress, address);
  const { data: ethData, isLoading: isEthLoading } = useBalance({ address });

  // If not on testnet, render nothing
  if (!IS_TESTNET) return null;

  const formattedBalance =
    rawBalance !== undefined
      ? parseFloat(formatUnits(rawBalance, decimals)).toFixed(2)
      : null;

  const numericBalance = rawBalance !== undefined ? Number(formatUnits(rawBalance, decimals)) : 0;
  const isLowBalance = requiredAmount ? numericBalance < parseFloat(requiredAmount) : numericBalance < 1;

  const numericEth = ethData?.value !== undefined ? Number(formatUnits(ethData.value, 18)) : 0;
  const isLowEth = !!address && !isEthLoading && numericEth < 0.0005;
  const formattedEth = ethData ? parseFloat(formatUnits(ethData.value, 18)).toFixed(4) : null;

  async function addUsdcToMetaMask() {
    if (typeof window === "undefined") return;
    const ethereum = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<boolean> } }).ethereum;
    if (!ethereum?.request) return;

    try {
      await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: usdcAddress,
            symbol: "USDC",
            decimals: 6,
            image: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
          },
        },
      });
      setAddedToWallet(true);
      setTimeout(() => setAddedToWallet(false), 3000);
    } catch {
      // Ignored if user dismissed
    }
  }

  function copyTokenAddress() {
    navigator.clipboard.writeText(usdcAddress);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  // ── VARIANT: Compact (used in dropdowns or toolbars) ──
  if (variant === "compact") {
    return (
      <div className={`p-3 rounded-2xl bg-emerald-50/70 dark:bg-[#08221D] border border-emerald-100 dark:border-[#164738] ${className}`}>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Base Sepolia
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
            <span className="text-[#0B3D2E] dark:text-white">
              {isUsdcLoading ? "..." : `${formattedBalance ?? "0.00"} USDC`}
            </span>
            <span className="text-slate-400">·</span>
            <span className={isLowEth ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-300"}>
              {isEthLoading ? "..." : `${formattedEth ?? "0.0000"} ETH`}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-emerald-100/60 dark:border-[#164738]/60 text-[11px]">
          <div className="flex items-center gap-2">
            <a
              href="https://faucet.base.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 dark:text-amber-400 font-semibold hover:underline"
            >
              Gas ETH ↗
            </a>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
            >
              USDC ↗
            </a>
          </div>
          <button
            type="button"
            onClick={addUsdcToMetaMask}
            className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-medium"
          >
            {addedToWallet ? "✓ Added" : "+ Add USDC"}
          </button>
        </div>
      </div>
    );
  }

  // ── VARIANT: Banner (used above forms when balance is low) ──
  if (variant === "banner") {
    const hasAnyIssue = isLowEth || isLowBalance;
    return (
      <div className={`rounded-2xl p-4 border transition-all ${
        isLowEth
          ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100"
          : isLowBalance
          ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-100"
          : "bg-emerald-50/60 dark:bg-[#08221D] border-emerald-200/80 dark:border-[#164738] text-[#0B3D2E] dark:text-emerald-200"
      } ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-xl sm:text-2xl mt-0.5">
              {isLowEth ? "⛽" : isLowBalance ? "🪙" : "✅"}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-xs sm:text-sm">
                  {isLowEth
                    ? "MetaMask Network Fee (ETH) Needed"
                    : isLowBalance
                    ? "Testnet USDC Required"
                    : "Base Sepolia Testnet Ready"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 font-semibold">
                  Gas ETH: {formattedEth ?? "0.0000"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 font-semibold">
                  USDC: {formattedBalance ?? "0.00"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {isLowEth
                  ? "MetaMask requires free Base Sepolia ETH to pay transaction network fees. Creating a circle costs 0 USDC, but needs ~0.0001 ETH for gas."
                  : isLowBalance
                  ? `You need Base Sepolia USDC to ${requiredAmount ? `contribute ${requiredAmount} USDC` : "participate in savings rounds"}. Claim 10 USDC free.`
                  : "Your wallet has both testnet ETH (for gas fees) and testnet USDC ready."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            {isLowEth && (
              <a
                href="https://faucet.base.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Get Free ETH Gas ↗</span>
              </a>
            )}
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#0B3D2E] hover:bg-[#072B20] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Get Free USDC ↗</span>
            </a>
            <button
              type="button"
              onClick={addUsdcToMetaMask}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B2F28] hover:bg-slate-50 border border-slate-200 dark:border-[#164738] text-xs font-semibold transition-colors"
            >
              {addedToWallet ? "✓ Added" : "+ Add USDC"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── VARIANT: Full Card (Default) ──
  return (
    <div className={`card p-5 border-dashed border-2 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-[#08221D]/50 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-sm">
            💧
          </span>
          <h3 className="text-sm font-bold text-[#0B3D2E] dark:text-white">
            Base Sepolia Faucet Hub
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          Testnet
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
        Testing on Base Sepolia requires both testnet ETH (for gas fees) and testnet USDC (for club deposits). Both are 100% free.
      </p>

      {/* Balance Pills */}
      {address && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#071F17] border border-emerald-100 dark:border-[#164738]">
            <span className="text-xs font-medium text-slate-500">USDC Balance:</span>
            <span className="font-mono font-bold text-sm text-[#0B3D2E] dark:text-emerald-300">
              {isUsdcLoading ? "Loading..." : `${formattedBalance ?? "0.00"} USDC`}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#071F17] border border-emerald-100 dark:border-[#164738]">
            <span className="text-xs font-medium text-slate-500">Gas (ETH) Balance:</span>
            <span className={`font-mono font-bold text-sm ${isLowEth ? "text-amber-600 dark:text-amber-400" : "text-[#0B3D2E] dark:text-emerald-300"}`}>
              {isEthLoading ? "Loading..." : `${formattedEth ?? "0.0000"} ETH`}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <a
          href="https://faucet.circle.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-xl bg-white dark:bg-[#071F17] hover:bg-emerald-50 dark:hover:bg-[#0D382E] border border-slate-200 dark:border-[#164738] text-left transition-all group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-[#0B3D2E] dark:text-white group-hover:text-emerald-600 transition-colors">
              Circle USDC Faucet ↗
            </div>
            <div className="text-[10px] text-slate-400">10 USDC / 2 hours</div>
          </div>
          <span className="text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
        </a>

        <a
          href="https://faucet.base.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-xl bg-white dark:bg-[#071F17] hover:bg-emerald-50 dark:hover:bg-[#0D382E] border border-slate-200 dark:border-[#164738] text-left transition-all group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-[#0B3D2E] dark:text-white group-hover:text-emerald-600 transition-colors">
              Base ETH Faucet ↗
            </div>
            <div className="text-[10px] text-slate-400">Free Sepolia ETH for gas</div>
          </div>
          <span className="text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
        </a>
      </div>

      {/* Token Details & Helper */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-emerald-100 dark:border-[#164738] text-xs">
        <button
          type="button"
          onClick={addUsdcToMetaMask}
          className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          {addedToWallet ? "✓ Added to MetaMask" : "+ Add USDC to MetaMask"}
        </button>

        <button
          type="button"
          onClick={copyTokenAddress}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 font-mono"
        >
          {copiedToken ? (
            <span className="text-emerald-600">✓ Address Copied!</span>
          ) : (
            <span>Copy USDC: {usdcAddress.slice(0, 6)}...{usdcAddress.slice(-4)}</span>
          )}
        </button>
      </div>
    </div>
  );
}
