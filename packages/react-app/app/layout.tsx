import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ChainGuard } from "@/components/ChainGuard";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "AjoClub",
  description: "Onchain rotating savings clubs on Celo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      <body className="bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-200">
        <Providers>
          <ChainGuard>
            <ThemeToggle />
            {children}
          </ChainGuard>
        </Providers>
      </body>
    </html>
  );
}
