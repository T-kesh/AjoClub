"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAccount, useReadContract } from "wagmi";
import { AJO_CLUB_ADDRESS, AJO_CLUB_ABI } from "@/lib/contract";
import { WalletConnect } from "@/components/WalletConnect";
import { useEffect, useState } from "react";
import { requestNotificationPermission } from "@/lib/notifications";

export default function Home() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        setShowNotificationPrompt(true);
      }
    }
  }, [mounted]);

  // Read live club count from Base Sepolia contract
  const { data: clubCount } = useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "clubCount",
  });

  const handleEnableNotifications = () => {
    requestNotificationPermission();
    setShowNotificationPrompt(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="text-5xl animate-bounce">🫙</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:py-16 flex flex-col items-center text-center">
        {/* Network Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Live on Base Sepolia · Gasless USDC ROSCAs
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-2xl leading-[1.1] mb-6">
          Rotating Savings Circles,{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
            Supercharged on Base
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-xl mb-10 leading-relaxed">
          Form trustless savings groups with friends or coworkers. Contribute USDC every cycle and claim the entire pot when your turn arrives.
        </p>

        {/* Notification prompt if permission default */}
        {showNotificationPrompt && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 p-4 mb-8 w-full max-w-md backdrop-blur">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3 font-medium">
              🔔 Enable round & contribution reminders on this device?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => setShowNotificationPrompt(false)}
                className="flex-1 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md mb-12">
          <Link href="/clubs" className="w-full sm:w-1/2">
            <button className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              <span>🔍</span> Browse Circles
            </button>
          </Link>
          <Link href="/create" className="w-full sm:w-1/2">
            <button className="w-full py-3.5 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-bold text-base transition-all shadow-sm">
              <span>+</span> Create Circle
            </button>
          </Link>
        </div>

        {/* Smart Wallet Card if disconnected */}
        {!isConnected && (
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 mb-14 shadow-sm text-left flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔑</span>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Coinbase Smart Wallet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Instant passkey sign-in. No extension or app required.
                </p>
              </div>
            </div>
            <WalletConnect />
          </div>
        )}

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left mb-16">
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">
              Gasless Contributions
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Sponsored by CDP Paymaster. Approve and deposit in a single tap without needing ETH.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm">
            <div className="text-2xl mb-2">🆔</div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">
              Basenames & OnchainKit
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Rosters automatically resolve member .base.eth names and verified avatars.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">
              Automated Payouts
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Autonomous daemon monitors cycles, records payments, and triggers payouts.
            </p>
          </div>
        </div>

        {/* Contract Info / Live Stat Banner */}
        <div className="w-full max-w-3xl rounded-2xl bg-gray-100/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Circles Created:
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {clubCount !== undefined ? clubCount.toString() : "…"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`https://sepolia.basescan.org/address/${AJO_CLUB_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
            >
              Contract: {AJO_CLUB_ADDRESS.slice(0, 6)}…{AJO_CLUB_ADDRESS.slice(-4)} ↗
            </a>
            <span>•</span>
            <span>USDC 6 Decimals</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>AjoClub · Onchain Rotating Savings Circles on Base Sepolia</p>
      </footer>
    </div>
  );
}
