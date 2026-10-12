"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { TOKENS, tokenDecimals } from "@/lib/contract";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import Link from "next/link";

export default function FaucetPage() {
  const { address, isConnected } = useAccount();

  // Balances
  const usdcAddress = TOKENS.baseSepolia.USDC;
  const decimals = tokenDecimals(usdcAddress);
  const { data: rawUsdcBalance, isLoading: isUsdcLoading, refetch: refetchUsdc } =
    useTokenBalance(usdcAddress, address);
  const { data: ethData, isLoading: isEthLoading, refetch: refetchEth } =
    useBalance({ address });

  // In-app claim state
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTx, setClaimTx] = useState<{
    txHash: string;
    basescanUrl: string;
    amount: string;
  } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [addedUsdc, setAddedUsdc] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const formattedEth = ethData
    ? parseFloat(formatUnits(ethData.value, 18)).toFixed(4)
    : "0.0000";
  const numericEth = ethData ? Number(formatUnits(ethData.value, 18)) : 0;
  const isSufficientEth = numericEth >= 0.005;

  const formattedUsdc =
    rawUsdcBalance !== undefined
      ? parseFloat(formatUnits(rawUsdcBalance, decimals)).toFixed(2)
      : "0.00";

  async function handleClaimEth() {
    if (!address) return;
    setIsClaiming(true);
    setClaimError(null);
    setClaimTx(null);

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to claim testnet ETH from faucet.");
      }

      setClaimTx({
        txHash: data.txHash,
        basescanUrl: data.basescanUrl,
        amount: data.amount,
      });

      // Refetch balance after confirmation
      setTimeout(() => {
        refetchEth();
      }, 2000);
    } catch (err: any) {
      setClaimError(err?.message || "Failed to process faucet claim.");
    } finally {
      setIsClaiming(false);
    }
  }

  async function handleAddUsdcToWallet() {
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
      setAddedUsdc(true);
      setTimeout(() => setAddedUsdc(false), 3000);
    } catch {
      // Ignored if user dismissed
    }
  }

  function handleCopyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="container-app py-8 sm:py-12 flex-1 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-3 border border-emerald-200 dark:border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Base Sepolia Testnet (84532)
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0B3D2E] dark:text-white tracking-tight">
            AjoClub Faucet Hub 💧
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Get free Base Sepolia ETH for transaction gas and testnet USDC for savings circles — with zero mainnet ETH required.
          </p>
        </div>

        {/* Live Wallet Status Banner */}
        {isConnected && address && (
          <div className="card p-4 sm:p-5 mb-8 border border-emerald-200 dark:border-[#164738] bg-white dark:bg-[#0A261D] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-[#071F17] border border-emerald-100 dark:border-[#1E5645] grid place-items-center text-lg shrink-0">
                  👛
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Connected Wallet
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#0B3D2E] dark:text-white">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      {copiedAddress ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Balances */}
              <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Gas (ETH)
                  </span>
                  <span className="font-mono text-sm font-bold text-[#0B3D2E] dark:text-white">
                    {isEthLoading ? "..." : `${formattedEth} ETH`}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Testnet USDC
                  </span>
                  <span className="font-mono text-sm font-bold text-[#0B3D2E] dark:text-emerald-400">
                    {isUsdcLoading ? "..." : `${formattedUsdc} USDC`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Faucet Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Card 1: In-App 1-Click ETH Faucet */}
          <div className="card p-6 border border-emerald-200/80 dark:border-[#164738] bg-white dark:bg-[#0A261D] flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 grid place-items-center text-xl">
                  ⛽
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Instant 1-Click
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-[#0B3D2E] dark:text-white">
                Base Sepolia Gas (ETH)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Claim <span className="font-semibold text-slate-700 dark:text-slate-200">0.0001 Base Sepolia ETH</span> directly to your wallet. That is enough to pay network fees for over 50 circle transactions.
              </p>

              {/* Status Notice */}
              {isSufficientEth && (
                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-300 text-xs">
                  ℹ️ Your wallet holds {formattedEth} ETH, which is plenty for network gas. Save faucet funds for other testers!
                </div>
              )}

              {/* Success Result */}
              {claimTx && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs animate-fade-in">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span> {claimTx.amount} Sent to Your Wallet!
                  </div>
                  <a
                    href={claimTx.basescanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline mt-1"
                  >
                    View Transaction on Basescan ↗
                  </a>
                </div>
              )}

              {/* Error Notice */}
              {claimError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs animate-fade-in">
                  <p className="font-bold mb-0.5">Claim Notice</p>
                  <p>{claimError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#164738]/60">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleClaimEth}
                  disabled={isClaiming || isSufficientEth}
                  className="w-full py-3 px-4 rounded-xl bg-[#0B3D2E] hover:bg-[#164738] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isClaiming ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Dispensing 0.0001 ETH on Base Sepolia…
                    </>
                  ) : (
                    <>
                      <span>💧</span> Claim 0.0001 Base Sepolia ETH
                    </>
                  )}
                </button>
              ) : (
                <p className="text-center text-xs text-slate-400 py-2 font-medium">
                  Connect wallet above to claim gas ETH
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Circle Testnet USDC Faucet */}
          <div className="card p-6 border border-emerald-200/80 dark:border-[#164738] bg-white dark:bg-[#0A261D] flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center text-xl">
                  🪙
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Circle Native
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-[#0B3D2E] dark:text-white">
                Base Sepolia USDC
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Claim <span className="font-semibold text-slate-700 dark:text-slate-200">10 USDC</span> from Circle&apos;s official testnet faucet. Required for creating and funding rotating savings circles.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#071F17] border border-slate-100 dark:border-[#164738]/60 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">USDC Token Contract:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(usdcAddress);
                      setCopiedAddress(true);
                      setTimeout(() => setCopiedAddress(false), 2000);
                    }}
                    className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {usdcAddress.slice(0, 6)}...{usdcAddress.slice(-4)}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#164738]/60 flex flex-col sm:flex-row gap-2">
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold transition-all shadow-sm text-center flex items-center justify-center gap-1.5"
              >
                <span>Circle Faucet (10 USDC) ↗</span>
              </a>
              <button
                type="button"
                onClick={handleAddUsdcToWallet}
                className="py-3 px-4 rounded-xl bg-white dark:bg-[#071F17] hover:bg-slate-50 dark:hover:bg-[#0D382D] border border-slate-200 dark:border-[#164738] text-xs font-bold transition-colors"
              >
                {addedUsdc ? "✓ Added" : "+ Add to Wallet"}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: External Zero-Mainnet Faucet Hub */}
        <div className="card p-6 sm:p-8 border border-slate-200 dark:border-[#164738]/80 bg-white dark:bg-[#0A261D] shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-xl">🌐</span>
            <h2 className="text-base sm:text-lg font-bold text-[#0B3D2E] dark:text-white">
              Alternative Zero-Mainnet Faucets (For Larger Amounts)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Need larger amounts of testnet ETH (0.05 – 0.5 ETH) for contract deployment or heavy testing? The faucets below require <span className="font-semibold text-slate-700 dark:text-slate-200">zero Ethereum Mainnet balance</span>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Superchain */}
            <a
              href="https://console.optimism.io/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071F17] hover:bg-emerald-50 dark:hover:bg-[#0D382D] border border-slate-100 dark:border-[#164738] transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block mb-1">
                  RECOMMENDED
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                  Superchain Faucet ↗
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Dispenses 0.05 – 0.1 Base Sepolia ETH. Requires GitHub login (account &gt; 30d).
                </p>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-3 block">
                0 ETH Mainnet Needed →
              </span>
            </a>

            {/* Chainlink */}
            <a
              href="https://faucets.chain.link/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071F17] hover:bg-emerald-50 dark:hover:bg-[#0D382D] border border-slate-100 dark:border-[#164738] transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-1">
                  OFFICIAL
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                  Chainlink Faucet ↗
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Dispenses 0.1 Base Sepolia ETH + LINK. Requires GitHub sign-in.
                </p>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-3 block">
                0 ETH Mainnet Needed →
              </span>
            </a>

            {/* PoW Miner */}
            <a
              href="https://sepolia-faucet.pk910.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071F17] hover:bg-emerald-50 dark:hover:bg-[#0D382D] border border-slate-100 dark:border-[#164738] transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block mb-1">
                  ZERO LOGIN
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                  PoW CPU Miner ↗
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Mine 0.1 – 0.5 Sepolia ETH in browser CPU (2 mins), then bridge via bridge.base.org.
                </p>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-3 block">
                No Accounts Required →
              </span>
            </a>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/clubs"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3D2E] dark:text-emerald-400 hover:underline"
            >
              Funds ready? Explore Active Rotating Circles →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
