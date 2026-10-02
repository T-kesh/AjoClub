"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { WalletConnect } from "./WalletConnect";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const pathname = usePathname();

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

        {/* Navigation Links */}
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
        </div>
      </div>
    </header>
  );
}

export default Navbar;
