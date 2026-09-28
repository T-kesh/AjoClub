"use client";
import { useRouter } from "next/navigation";
import { useIsVerified } from "./useAjoClub";

export function useSelfVerify(address: `0x${string}` | undefined) {
  const router = useRouter();
  const { data: isVerified, isLoading } = useIsVerified(address);

  function startVerification(returnTo?: string) {
    const params = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    router.push(`/verify${params}`);
  }

  return { isVerified: Boolean(isVerified), isLoading, startVerification };
}
