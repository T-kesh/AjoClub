import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ChainGuard } from "@/components/ChainGuard";

export const metadata: Metadata = {
  title: "AjoClub",
  description: "Onchain rotating savings clubs on Celo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <ChainGuard>{children}</ChainGuard>
        </Providers>
      </body>
    </html>
  );
}
