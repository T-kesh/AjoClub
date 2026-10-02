import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ChainGuard } from "@/components/ChainGuard";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AjoClub | Save Together. Take Turns.",
  description: "Onchain rotating savings clubs (ROSCAs) powered by Base, Coinbase Smart Wallet, and USDC.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="font-sans bg-[#F8FAF6] text-[#1F2937] dark:bg-[#071F17] dark:text-gray-100 min-h-screen transition-colors duration-200 antialiased selection:bg-[#22C55E]/20 selection:text-[#0B3D2E]">
        <Providers>
          <ChainGuard>
            {children}
          </ChainGuard>
        </Providers>
      </body>
    </html>
  );
}
