import React from "react";
import Image from "next/image";

type Props = {
  size?: "sm" | "md" | "lg";
  dark?: boolean;
  iconOnly?: boolean;
  showTagline?: boolean;
  variant?: "image" | "svg" | "full";
  className?: string;
};

const sizes = {
  sm: { icon: 32, text: "text-lg", tagline: "text-[10px]", gap: "gap-2" },
  md: { icon: 40, text: "text-xl", tagline: "text-xs", gap: "gap-2.5" },
  lg: { icon: 56, text: "text-3xl sm:text-4xl", tagline: "text-sm", gap: "gap-3.5" },
};

export function Logo({
  size = "md",
  dark = false,
  iconOnly = false,
  showTagline = false,
  variant = "image",
  className = "",
}: Props) {
  const s = sizes[size];

  // If user requests the full pre-rendered lockup banner
  if (variant === "full") {
    return (
      <div className={`relative inline-block ${className}`}>
        <Image
          src="/images/logo-full.png"
          alt="AjoClub - Save Together. Take Turns."
          width={size === "lg" ? 360 : size === "md" ? 260 : 180}
          height={size === "lg" ? 144 : size === "md" ? 104 : 72}
          className="h-auto w-auto object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {/* Brand Icon: 3D Rendered Pot (Default) or Crisp Vector SVG */}
      {variant === "image" ? (
        <div
          className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-200"
          style={{ width: s.icon, height: s.icon }}
        >
          <Image
            src="/images/logo-pot-sm.png"
            alt="AjoClub Savings Pot"
            width={s.icon}
            height={s.icon}
            className="w-full h-full object-contain drop-shadow-sm"
            priority
          />
        </div>
      ) : (
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0 drop-shadow-sm"
        >
          <defs>
            <linearGradient id="ajoGreenGrad" x1="10" y1="12" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#35E77B" />
              <stop offset="1" stopColor="#16A34A" />
            </linearGradient>
            <linearGradient id="goldRimGrad" x1="18" y1="10" x2="46" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFD83D" />
              <stop offset="1" stopColor="#FACC15" />
            </linearGradient>
          </defs>
          <path d="M18 18C18 13.6 21.6 10 26 10H38C42.4 10 46 13.6 46 18V22H18V18Z" fill="url(#goldRimGrad)" />
          <ellipse cx="32" cy="17" rx="14" ry="4.5" fill="#FFD83D" />
          <path d="M13 23C13 19.7 15.7 17 19 17H45C48.3 17 51 19.7 51 23V39C51 49.5 42.5 58 32 58C21.5 58 13 49.5 13 39V23Z" fill="url(#ajoGreenGrad)" />
          <path d="M32 20C42.5 20 51 28.5 51 39C51 49.5 42.5 58 32 58C28 58 24.3 56.8 21.2 54.7C27.7 51.8 32 45.4 32 38C32 30.6 27.7 24.2 21.2 21.3C24.3 20.5 28 20 32 20Z" fill="#0B3D2E" />
          <circle cx="21" cy="29" r="4.5" fill="#DFFFEA" />
          <circle cx="21" cy="44" r="4.5" fill="#DFFFEA" />
          <circle cx="43" cy="31" r="5" fill="#FACC15" />
        </svg>
      )}

      {!iconOnly && (
        <div className="flex flex-col text-left">
          <span
            className={`${s.text} font-extrabold tracking-[-0.04em] leading-tight ${
              dark ? "text-white" : "text-[#0B3D2E] dark:text-white"
            }`}
          >
            Ajo<span className="text-[#22C55E]">Club</span>
          </span>
          {showTagline && (
            <span
              className={`${s.tagline} font-medium text-slate-500 dark:text-slate-400 -mt-0.5 tracking-tight`}
            >
              Save Together. Take Turns.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default Logo;
