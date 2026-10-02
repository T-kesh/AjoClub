"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Logo } from "@/components/Logo";
import { useReadContract } from "wagmi";
import { AJO_CLUB_ADDRESS, AJO_CLUB_ABI } from "@/lib/contract";
import { useEffect, useState } from "react";
import { requestNotificationPermission } from "@/lib/notifications";

export default function Home() {
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
      <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] flex flex-col items-center justify-center">
        <Logo size="lg" iconOnly className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF6] dark:bg-[#071F17] text-[#1F2937] dark:text-gray-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mesh overflow-hidden border-b border-slate-200/50 dark:border-[#164738]/50">
          <div className="container-app grid min-h-[640px] items-center gap-12 py-12 lg:py-16 lg:grid-cols-[1.1fr_.9fr]">
            {/* Left Content */}
            <div className="text-left">
              <span className="eyebrow">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                Onchain Rotating Savings Clubs · Base Sepolia
              </span>

              <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.02] tracking-[-0.05em] text-[#0B3D2E] dark:text-white sm:text-6xl lg:text-7xl">
                Save Together.<br />
                <span className="text-[#22C55E]">Take Turns.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                Join or create a savings club. Contribute a fixed amount each cycle and one member receives the full pot. No banker. No trust required.
              </p>

              {/* Notification Prompt if applicable */}
              {showNotificationPrompt && (
                <div className="mt-6 rounded-2xl border border-green-200 dark:border-green-800 bg-white/80 dark:bg-[#0B2F28]/80 p-4 max-w-md shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-[#0B3D2E] dark:text-green-300 mb-2">
                    🔔 Enable round & contribution reminders?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      className="btn-green !py-1.5 !px-3 !text-xs !font-bold"
                    >
                      Enable
                    </button>
                    <button
                      onClick={() => setShowNotificationPrompt(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5"
                    >
                      Later
                    </button>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/create" className="btn-green text-base px-6 py-3.5 shadow-md">
                  Create a Club <span className="ml-1">→</span>
                </Link>
                <Link href="/clubs" className="btn-secondary text-base px-6 py-3.5">
                  Browse Clubs
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-[#22C55E] font-bold">✓</span> Base Sepolia L2
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#22C55E] font-bold">✓</span> Coinbase Smart Wallet
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#22C55E] font-bold">✓</span> Paymaster Gasless
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#22C55E] font-bold">✓</span> Native USDC
                </span>
              </div>
            </div>

            {/* Right Graphic: Illustrated circular interactive pot */}
            <div className="relative flex justify-center items-center py-6">
              {/* Glow backdrop */}
              <div className="absolute h-80 w-80 rounded-full bg-green-300/30 dark:bg-green-500/10 blur-3xl pointer-events-none" />

              {/* Glass disk container */}
              <div className="relative grid h-[360px] w-[360px] sm:h-[420px] sm:w-[420px] place-items-center rounded-full border border-green-200/80 dark:border-green-800/60 bg-white/70 dark:bg-[#0A2920]/80 shadow-[0_30px_100px_rgba(11,61,46,.12)] dark:shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur">
                {/* Floating feature pills */}
                <div className="absolute -top-3 left-6 sm:left-10 rounded-2xl bg-white dark:bg-[#0D382D] border border-slate-200/70 dark:border-[#164738] px-4 py-2.5 shadow-lg text-xs font-bold text-[#0B3D2E] dark:text-white flex items-center gap-2 transform -rotate-3 hover:rotate-0 transition-transform cursor-default">
                  <span>💰</span> Contribute USDC
                </div>
                <div className="absolute right-0 sm:-right-2 top-24 rounded-2xl bg-white dark:bg-[#0D382D] border border-slate-200/70 dark:border-[#164738] px-4 py-2.5 shadow-lg text-xs font-bold text-[#0B3D2E] dark:text-white flex items-center gap-2 transform rotate-3 hover:rotate-0 transition-transform cursor-default">
                  <span>🔄</span> Rotate Payouts
                </div>
                <div className="absolute bottom-16 -left-2 sm:left-0 rounded-2xl bg-white dark:bg-[#0D382D] border border-slate-200/70 dark:border-[#164738] px-4 py-2.5 shadow-lg text-xs font-bold text-[#0B3D2E] dark:text-white flex items-center gap-2 transform rotate-2 hover:rotate-0 transition-transform cursor-default">
                  <span>⚡</span> Gasless Paymaster
                </div>
                <div className="absolute -bottom-3 right-8 sm:right-12 rounded-2xl bg-white dark:bg-[#0D382D] border border-slate-200/70 dark:border-[#164738] px-4 py-2.5 shadow-lg text-xs font-bold text-[#0B3D2E] dark:text-white flex items-center gap-2 transform -rotate-2 hover:rotate-0 transition-transform cursor-default">
                  <span>✓</span> Trustless Smart Contract
                </div>

                {/* Center Big Logo */}
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <Logo size="lg" iconOnly />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Stats Grid */}
        <section className="container-app py-12">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["100%", "On-chain & Trustless", "Contract enforces round payouts"],
              ["USDC", "Native Stablecoin", "6-decimal digital dollar"],
              ["1-Tap", "Passkey Smart Wallet", "Zero seed phrases or extensions"],
              ["∞", "Rotating Cycles", "Automated multi-member rounds"],
            ].map(([value, label, sub]) => (
              <div key={label} className="card p-6 text-center hover:border-green-300 dark:hover:border-green-700 transition-colors">
                <div className="text-3xl font-extrabold text-[#0B3D2E] dark:text-[#22C55E]">
                  {value}
                </div>
                <div className="mt-1 font-bold text-sm text-slate-800 dark:text-slate-100">
                  {label}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Banner */}
        <section className="container-app pb-16">
          <div className="card overflow-hidden bg-[#0B3D2E] dark:bg-[#061C15] p-8 sm:p-12 text-white shadow-xl grid gap-8 md:grid-cols-[1fr_auto] md:items-center border border-green-800/40">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#22C55E]">
                How It Works
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
                A familiar savings tradition, supercharged on Base.
              </h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-white/80">
                Create a circle, invite verified members, contribute USDC each cycle with gasless paymaster sponsorship, and claim the entire pot when your round arrives.
              </p>
            </div>
            <Link href="/clubs" className="btn-green text-base px-6 py-3.5 shrink-0 whitespace-nowrap">
              Explore Clubs →
            </Link>
          </div>
        </section>

        {/* Live Contract Details Bar */}
        <section className="container-app pb-16">
          <div className="rounded-2xl bg-white dark:bg-[#0B2F28] border border-slate-200 dark:border-[#164738] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B3D2E] dark:text-white">Active Onchain Circles:</span>
              <span className="font-bold text-[#22C55E] text-sm font-mono">
                {clubCount !== undefined ? clubCount.toString() : "…"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`https://sepolia.basescan.org/address/${AJO_CLUB_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0B7A4B] dark:text-[#22C55E] hover:underline font-mono"
              >
                Contract: {AJO_CLUB_ADDRESS.slice(0, 6)}…{AJO_CLUB_ADDRESS.slice(-4)} ↗
              </a>
              <span>•</span>
              <span>Base Sepolia (84532)</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-[#164738]/80 py-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-[#061C15]/50">
        <p>AjoClub · Onchain Rotating Savings Circles (ROSCAs) on Base</p>
      </footer>
    </div>
  );
}
