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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AjoClub</h1>
      </main>
    );
  }

  if (!isMiniPay) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-5xl mb-4">🫙</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AjoClub</h1>
        <p className="text-gray-500 mb-8 max-w-xs">Trustless rotating savings circles on Celo</p>
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 max-w-sm w-full">
          <p className="text-sm text-yellow-800 font-medium">
            Open this link inside the MiniPay wallet browser to get started.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="text-5xl mb-4">🫙</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">AjoClub</h1>
      <p className="text-gray-500 mb-10 text-center max-w-xs">
        Join or start a rotating savings circle with your community.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/create">
          <button className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition-colors shadow">
            Create Club
          </button>
        </Link>
        <Link href="/clubs">
          <button className="w-full py-4 rounded-2xl bg-white border-2 border-green-500 text-green-600 font-bold text-lg hover:bg-green-50 transition-colors shadow-sm">
            Browse Clubs
          </button>
        </Link>
      </div>
    </main>
  );
}
