"use client";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AJO_CLUB_ABI, AJO_CLUB_ADDRESS } from "@/lib/contract";

export function useGetClub(clubId: bigint | undefined) {
  return useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getClub",
    args: clubId !== undefined ? [clubId] : undefined,
    query: { enabled: clubId !== undefined },
  });
}

export function useGetMemberPaymentStatus(clubId: bigint | undefined) {
  return useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "getMemberPaymentStatus",
    args: clubId !== undefined ? [clubId] : undefined,
    query: { enabled: clubId !== undefined },
  });
}

export function useIsVerified(member: `0x${string}` | undefined) {
  return useReadContract({
    address: AJO_CLUB_ADDRESS,
    abi: AJO_CLUB_ABI,
    functionName: "isVerified",
    args: member ? [member] : undefined,
    query: { enabled: !!member },
  });
}

export function useCreateClub() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function createClub(
    name: string,
    token: `0x${string}`,
    contribution: bigint,
    cycleDuration: bigint,
    maxMembers: bigint
  ) {
    return writeContractAsync({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "createClub",
      type: "legacy",
      args: [name, token, contribution, cycleDuration, maxMembers],
    });
  }

  return { createClub, hash, isPending, isConfirming, isSuccess, error };
}

export function useJoinClub() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function joinClub(clubId: bigint) {
    return writeContractAsync({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "joinClub",
      type: "legacy",
      args: [clubId],
    });
  }

  return { joinClub, hash, isPending, isConfirming, isSuccess, error };
}

export function useContribute() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function contribute(clubId: bigint) {
    return writeContractAsync({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "contribute",
      type: "legacy",
      args: [clubId],
    });
  }

  return { contribute, hash, isPending, isConfirming, isSuccess, error };
}

export function useTriggerPayout() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function triggerPayout(clubId: bigint) {
    return writeContractAsync({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "triggerPayout",
      type: "legacy",
      args: [clubId],
    });
  }

  return { triggerPayout, hash, isPending, isConfirming, isSuccess, error };
}

export function useStartClub() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function startClub(clubId: bigint) {
    return writeContractAsync({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "startClub",
      type: "legacy",
      args: [clubId],
    });
  }

  return { startClub, hash, isPending, isConfirming, isSuccess, error };
}
