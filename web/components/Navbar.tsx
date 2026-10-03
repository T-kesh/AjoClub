"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { WalletConnect } from "./WalletConnect";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { useState, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/create", label: "Create Club", icon: "➕" },
    { href: "/clubs", label: "Browse Clubs", icon: "🔍" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 dark:border-[#164738]/80 bg-[#F8FAF6]/95 dark:bg-[#071F17]/95 backdrop-blur-xl transition-colors">
      <div className="container-app flex h-16 sm:h-18 items-center justify-between py-2.5 sm:py-3">
        {/* Brand Logo - Responsive sizing */}
        <Link href="/" aria-label="AjoClub home" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
          <Logo size="md" className="hidden sm:flex" />
          <Logo size="sm" className="flex sm:hidden" />
          <span className="hidden sm:inline-flex text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-green-100 text-[#0B7A4B] dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800/60 ml-1">
            Base Sepolia
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-[#0B3D2E] dark:text-[#22C55E]"
                    : "text-slate-500 hover:text-[#0B3D2E] dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions Container */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle className="hidden sm:flex" />
          <WalletConnect />

          {/* Mobile Hamburger Button - Guaranteed visible on mobile with shrink-0 */}
          <button
            id="mobile-menu-toggle"
            type="button"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-xl border border-slate-200 dark:border-[#1E5645] bg-white dark:bg-[#0D382D] gap-[5px] transition-all hover:bg-slate-50 dark:hover:bg-[#13493B] shrink-0 active:scale-95 shadow-sm"
          >
            <span
              className={`block h-0.5 w-4 bg-[#0B3D2E] dark:bg-white rounded-full transition-all duration-200 origin-center ${
                mobileOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-4 bg-[#0B3D2E] dark:bg-white rounded-full transition-all duration-200 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-4 bg-[#0B3D2E] dark:bg-white rounded-full transition-all duration-200 origin-center ${
                mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-slate-100 dark:border-[#164738]/60 bg-white/95 dark:bg-[#061E16]/95 backdrop-blur-xl ${
          mobileOpen ? "max-h-[500px] opacity-100 shadow-xl" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="container-app py-4 flex flex-col gap-2">
          {/* Primary Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-green-100/70 text-[#0B3D2E] dark:bg-green-950/60 dark:text-[#22C55E] shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0D382D] hover:text-[#0B3D2E] dark:hover:text-white"
                  }`}
                >
                  <span className="text-base">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="h-px w-full bg-slate-100 dark:bg-[#164738]/60 my-1" />

          {/* External Ecosystem Links */}
          <div className="flex flex-col gap-1">
            <a
              href="https://t.me/Ajoclub_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0D382D] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">🤖</span>
                <span>Telegram AI Coordinator</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                @Ajoclub_bot ↗
              </span>
            </a>

            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0D382D] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">🪙</span>
                <span>Circle Testnet USDC Faucet</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Claim 10 USDC ↗
              </span>
            </a>
          </div>

          {/* Bottom Drawer Controls & Network Bar */}
          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-[#164738]/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Base Sepolia Testnet
              </span>
            </div>

            {/* Mobile Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1E5645] bg-slate-50 dark:bg-[#0B2F28] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <span>{isDark ? "☀️ Light" : "🌙 Dark"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
