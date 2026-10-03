"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface StepInfo {
  id: number;
  stepNumber: string;
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  potState: string;
  highlightColor: string;
  borderActive: string;
  positionClass: string;
}

const steps: StepInfo[] = [
  {
    id: 0,
    stepNumber: "01",
    title: "Contribute USDC",
    badge: "1-Tap Save",
    subtitle: "Fixed cycle deposit",
    description: "Every club member deposits their fixed share (e.g. 50 USDC) directly from their wallet.",
    potState: "📥 Collecting: 5 members × $50 USDC",
    highlightColor: "text-emerald-600 dark:text-emerald-400",
    borderActive: "border-[#22C55E] shadow-[0_15px_30px_-5px_rgba(34,197,94,0.35)] ring-2 ring-[#22C55E]/50",
    positionClass: "-top-6 -left-2 sm:left-2",
  },
  {
    id: 1,
    stepNumber: "02",
    title: "Gasless Paymaster",
    badge: "0 Gas Fees",
    subtitle: "Sponsored on Base",
    description: "Coinbase Paymaster covers 100% of gas fees via ERC-5792 batched calls. No ETH required.",
    potState: "⚡ Gas Fee: $0.00 (Sponsored)",
    highlightColor: "text-amber-500 dark:text-amber-400",
    borderActive: "border-amber-400 shadow-[0_15px_30px_-5px_rgba(250,204,21,0.35)] ring-2 ring-amber-400/50",
    positionClass: "-top-6 -right-2 sm:right-2",
  },
  {
    id: 2,
    stepNumber: "03",
    title: "Trustless Escrow",
    badge: "Non-Custodial",
    subtitle: "Verifiable rules",
    description: "The Base Sepolia smart contract securely locks the accumulated pool. No human banker.",
    potState: "🔒 Total Pool: $250 USDC Locked",
    highlightColor: "text-cyan-600 dark:text-cyan-400",
    borderActive: "border-cyan-400 shadow-[0_15px_30px_-5px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400/50",
    positionClass: "-bottom-6 -right-2 sm:right-2",
  },
  {
    id: 3,
    stepNumber: "04",
    title: "Rotate Payouts",
    badge: "Automated",
    subtitle: "Turn holder takes pot",
    description: "When the cycle concludes, the contract sends the entire lump sum directly to that round's winner.",
    potState: "🎉 Payout: $250 USDC sent to Member #1",
    highlightColor: "text-purple-600 dark:text-purple-400",
    borderActive: "border-purple-400 shadow-[0_15px_30px_-5px_rgba(168,85,247,0.35)] ring-2 ring-purple-400/50",
    positionClass: "-bottom-6 -left-2 sm:left-2",
  },
];

export function InteractiveLifecycleWheel() {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance step every 3.5s unless hovered
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const current = steps[activeStep];

  return (
    <div
      className="relative flex flex-col items-center justify-center py-6 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background radial atmosphere glow */}
      <div className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-green-400/20 via-yellow-300/15 to-emerald-500/20 dark:from-green-500/10 dark:via-emerald-400/10 dark:to-yellow-500/5 blur-3xl pointer-events-none" />

      {/* Main Circular Disc Stage */}
      <div className="relative grid h-[420px] w-[420px] sm:h-[480px] sm:w-[480px] place-items-center">
        
        {/* Animated SVG Orbit Ring with Flowing Energy Beam */}
        <svg
          viewBox="0 0 480 480"
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
        >
          {/* Subtle static guideline orbit */}
          <circle
            cx="240"
            cy="240"
            r="185"
            stroke="currentColor"
            className="text-slate-200/80 dark:text-[#164738]/60"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />

          {/* Animated flowing clockwise energy beam */}
          <circle
            cx="240"
            cy="240"
            r="185"
            stroke="url(#orbitGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="90 300"
            className="animate-spin-slow origin-center opacity-85"
          />

          {/* Secondary counter-rotating dashed inner orbit */}
          <circle
            cx="240"
            cy="240"
            r="115"
            stroke="url(#goldOrbitGradient)"
            strokeWidth="1.5"
            strokeDasharray="8 12"
            className="animate-spin-reverse-slow origin-center opacity-40"
          />

          <defs>
            <linearGradient id="orbitGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
            <linearGradient id="goldOrbitGradient" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD83D" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Hub: Large Prominent 3D Savings Pot */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Outer glowing halo ring */}
          <div className="absolute h-48 w-48 rounded-full bg-gradient-to-tr from-[#22C55E]/20 via-[#FACC15]/25 to-transparent animate-pulse-glow" />

          {/* Center Glass Pedestal */}
          <div className="relative flex flex-col items-center justify-center h-44 w-44 sm:h-52 sm:w-52 rounded-full border border-green-200/80 dark:border-green-700/60 bg-white/80 dark:bg-[#0B2F28]/90 shadow-[0_20px_60px_rgba(11,61,46,0.18)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 group">
            
            {/* The Majestic Center 3D Pot - 128px high-fidelity image */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 transition-transform duration-300 hover:scale-105 animate-float-smooth drop-shadow-xl">
              <Image
                src="/images/logo-pot.png"
                alt="AjoClub 3D Savings Pot"
                width={144}
                height={144}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            {/* Live Pot Status Pill - changes with active step */}
            <div className="absolute -bottom-3 sm:-bottom-4 px-3.5 py-1 rounded-full bg-[#0B3D2E] text-white dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-500/40 text-[10px] sm:text-xs font-bold tracking-tight shadow-md whitespace-nowrap animate-fade-in flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
              <span>{current.potState}</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4 3D-VISUALIZATION LIFECYCLE NODES                           */}
        {/* ============================================================ */}

        {/* NODE 01: CONTRIBUTE USDC */}
        <button
          onClick={() => setActiveStep(0)}
          className={`absolute ${steps[0].positionClass} z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-[#0A2920]/95 backdrop-blur-md p-2.5 sm:p-3 text-left transition-all duration-300 border ${
            activeStep === 0
              ? `${steps[0].borderActive} scale-105 -translate-y-1`
              : "border-slate-200/80 dark:border-[#164738] hover:border-emerald-300 dark:hover:border-emerald-700 shadow-lg hover:scale-102"
          }`}
        >
          {/* 3D Isometric USDC Coin */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-300 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow">
              <circle cx="18" cy="18" r="15" fill="#2775CA" />
              <circle cx="18" cy="18" r="12" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 2" />
              <path
                d="M19.5 12.5H16C14.6 12.5 13.5 13.6 13.5 15C13.5 16.4 14.6 17.5 16 17.5H20C21.4 17.5 22.5 18.6 22.5 20C22.5 21.4 21.4 22.5 20 22.5H16.5M18 10V12.5M18 22.5V25"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 01
              </span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                Deposit
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#0B3D2E] dark:text-white">
              Contribute USDC
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Fixed cycle deposit
            </div>
          </div>
        </button>

        {/* NODE 02: GASLESS PAYMASTER */}
        <button
          onClick={() => setActiveStep(1)}
          className={`absolute ${steps[1].positionClass} z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-[#0A2920]/95 backdrop-blur-md p-2.5 sm:p-3 text-left transition-all duration-300 border ${
            activeStep === 1
              ? `${steps[1].borderActive} scale-105 -translate-y-1`
              : "border-slate-200/80 dark:border-[#164738] hover:border-amber-300 dark:hover:border-amber-700 shadow-lg hover:scale-102"
          }`}
        >
          {/* 3D Isometric Lightning Bolt Shield */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow">
              <path
                d="M18 4L7 9V17C7 24.5 11.7 31.4 18 33C24.3 31.4 29 24.5 29 17V9L18 4Z"
                fill="#0B3D2E"
              />
              <path
                d="M19 9L11 19H17L15 27L23 17H17L19 9Z"
                fill="#FFD83D"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Step 02
              </span>
              <span className="rounded bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-300">
                $0 Gas
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#0B3D2E] dark:text-white">
              Gasless Paymaster
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Sponsored on Base
            </div>
          </div>
        </button>

        {/* NODE 03: TRUSTLESS SMART CONTRACT */}
        <button
          onClick={() => setActiveStep(2)}
          className={`absolute ${steps[2].positionClass} z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-[#0A2920]/95 backdrop-blur-md p-2.5 sm:p-3 text-left transition-all duration-300 border ${
            activeStep === 2
              ? `${steps[2].borderActive} scale-105 -translate-y-1`
              : "border-slate-200/80 dark:border-[#164738] hover:border-cyan-300 dark:hover:border-cyan-700 shadow-lg hover:scale-102"
          }`}
        >
          {/* 3D Isometric Safe / Contract Vault */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow">
              <rect x="6" y="8" width="24" height="22" rx="4" fill="#0B3D2E" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="5" stroke="#FACC15" strokeWidth="2" />
              <path d="M18 16V18L19.5 19.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="11" r="1" fill="#38BDF8" />
              <circle cx="27" cy="11" r="1" fill="#38BDF8" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Step 03
              </span>
              <span className="rounded bg-cyan-100 dark:bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-bold text-cyan-800 dark:text-cyan-300">
                Escrow
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#0B3D2E] dark:text-white">
              Trustless Escrow
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Non-custodial rules
            </div>
          </div>
        </button>

        {/* NODE 04: ROTATE PAYOUTS */}
        <button
          onClick={() => setActiveStep(3)}
          className={`absolute ${steps[3].positionClass} z-20 flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-[#0A2920]/95 backdrop-blur-md p-2.5 sm:p-3 text-left transition-all duration-300 border ${
            activeStep === 3
              ? `${steps[3].borderActive} scale-105 -translate-y-1`
              : "border-slate-200/80 dark:border-[#164738] hover:border-purple-300 dark:hover:border-purple-700 shadow-lg hover:scale-102"
          }`}
        >
          {/* 3D Isometric Rotating Trophy & Payout Burst */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-400 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" fill="none" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow">
              <path
                d="M9 10C9 14.5 12 18 16 19.5V23H13C12.4 23 12 23.4 12 24V26H24V24C24 23.4 23.6 23 23 23H20V19.5C24 18 27 14.5 27 10V8H9V10Z"
                fill="#FFD83D"
              />
              <path d="M9 11H6C4.9 11 4 11.9 4 13C4 15.5 6 17.5 8.5 17.5H10" stroke="#FFD83D" strokeWidth="1.5" />
              <path d="M27 11H30C31.1 11 32 11.9 32 13C32 15.5 30 17.5 27.5 17.5H26" stroke="#FFD83D" strokeWidth="1.5" />
              <circle cx="18" cy="13" r="2.5" fill="#0B3D2E" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Step 04
              </span>
              <span className="rounded bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 text-[9px] font-bold text-purple-800 dark:text-purple-300">
                Claim Pot
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#0B3D2E] dark:text-white">
              Rotate Payouts
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Turn holder takes all
            </div>
          </div>
        </button>

      </div>

      {/* ============================================================ */}
      {/* INTERACTIVE CONTROLS & EXPLAINER STRIP                       */}
      {/* ============================================================ */}
      <div className="mt-8 max-w-md w-full px-4">
        {/* Step indicator bar */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeStep === idx
                  ? "bg-[#22C55E] w-full"
                  : "bg-slate-200 dark:bg-[#164738] hover:bg-slate-300 dark:hover:bg-[#1E5645]"
              }`}
              aria-label={`Go to step ${s.stepNumber}`}
            />
          ))}
        </div>

        {/* Active Stage Description Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#164738] bg-white/80 dark:bg-[#0B2F28]/90 p-3.5 backdrop-blur-md shadow-sm transition-all flex items-center justify-between gap-3">
          <div className="text-left">
            <div className="text-xs font-bold text-[#0B3D2E] dark:text-white flex items-center gap-2">
              <span className={current.highlightColor}>
                {current.stepNumber}. {current.title}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              {current.description}
            </div>
          </div>

          {/* Interactive Pause/Play indicator */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Play cycle animation" : "Pause on this step"}
            className="shrink-0 p-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#08261F] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#13493B] transition-colors"
          >
            {isPaused ? "▶" : "⏸"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InteractiveLifecycleWheel;
