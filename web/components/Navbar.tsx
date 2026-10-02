"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { WalletConnect } from "./WalletConnect";
import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/create", label: "Create Club" },
    { href: "/clubs", label: "Browse Clubs" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 dark:border-[#164738]/80 bg-[#F8FAF6]/90 dark:bg-[#071F17]/90 backdrop-blur-xl transition-colors">
      <div className="container-app flex h-18 items-center justify-between py-3">
        {/* Brand Logo */}
        <Link href="/" aria-label="AjoClub home" className="flex items-center gap-2 group">
          <Logo size="md" />
          <span className="hidden sm:inline-flex text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-green-100 text-[#0B7A4B] dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800/60 ml-1">
            Base Sepolia
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <WalletConnect />

          {/* Mobile Hamburger Button */}
          <button
            id="mobile-menu-toggle"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-xl border border-slate-200 dark:border-[#1E5645] bg-white dark:bg-[#0D382D] gap-[5px] transition-colors hover:bg-slate-50 dark:hover:bg-[#13493B]"
          >
            <span
              className={`block h-0.5 w-4 bg-[#0B3D2E] dark:bg-white rounded-full transition-all duration-200 ${
                mobileOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-4 bg-[#0B3D2E] dark:bg-white rounded-full transition-all duration-200 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-4 bg-[#0B3D2E] dark:bg-white rounded-full transition-all duration-200 ${
                mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out ${
          mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="container-app pb-4 pt-1 flex flex-col gap-1 border-t border-slate-100 dark:border-[#164738]/60">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-green-50 dark:bg-green-950/40 text-[#0B3D2E] dark:text-[#22C55E]"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0F3B2F] hover:text-[#0B3D2E] dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
