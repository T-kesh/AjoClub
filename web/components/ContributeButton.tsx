"use client";
import { useRouter } from "next/navigation";

export function ContributeButton({ clubId }: { clubId: bigint }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/club/${clubId}/contribute`)}
      className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold text-lg transition-colors"
    >
      Contribute
    </button>
  );
}
