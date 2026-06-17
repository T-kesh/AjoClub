"use client";
import Link from "next/link";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useEffect, useState } from "react";

export default function Home() {
  const { isMiniPay } = useMiniPay();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-5xl mb-4">🫙</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">AjoClub</h1>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-5xl mb-4">🫙</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">AjoClub</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10 text-center max-w-xs">
        Trustless rotating savings circles on Celo. Contribute each cycle, receive the full pot in your round.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {isMiniPay ? (
          <>
            <Link href="/create">
              <button className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition-colors shadow">
                Create Club
              </button>
            </Link>
            <Link href="/clubs">
              <button className="w-full py-4 rounded-2xl bg-white dark:bg-gray-800 border-2 border-green-500 dark:border-green-500 text-green-600 dark:text-green-400 font-bold text-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                Browse Clubs
              </button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/clubs">
              <button className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition-colors shadow">
                Browse Clubs
              </button>
            </Link>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Want to create or join a club?</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Open this app inside the <span className="font-semibold text-gray-500 dark:text-gray-400">MiniPay</span> wallet to transact.</p>
            </div>
            <div className="flex flex-col gap-1 text-center pt-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">Built on Celo · Powered by Mento stablecoins</p>
              <a href="https://celoscan.io/address/0x95cB4aA0b634D02E218B2ae2b85B464007c3457c" target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 dark:text-green-400 underline">
                View contract on Celoscan
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
