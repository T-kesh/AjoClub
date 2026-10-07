"use client";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AJO_CLUB_ABI, AJO_CLUB_ADDRESS, CHAIN_ID } from "@/lib/contract";

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
    gracePeriod: bigint,
    maxMembers: bigint
  ) {
    return writeContractAsync({
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "createClub",
      args: [name, token, contribution, cycleDuration, gracePeriod, maxMembers],
    });
  }

  return { createClub, hash, isPending, isConfirming, isSuccess, error };
}

export function useJoinClub() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function joinClub(clubId: bigint) {
    return writeContractAsync({
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "joinClub",
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
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "contribute",
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
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "triggerPayout",
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
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "startClub",
      args: [clubId],
    });
  }

  return { startClub, hash, isPending, isConfirming, isSuccess, error };
}

export function useCancelClub() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function cancelClub(clubId: bigint) {
    return writeContractAsync({
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "cancelClub",
      args: [clubId],
    });
  }

  return { cancelClub, hash, isPending, isConfirming, isSuccess, error };
}

export function useLeaveClub() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function leaveClub(clubId: bigint) {
    return writeContractAsync({
      chainId: CHAIN_ID,
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_ABI,
      functionName: "leaveClub",
      args: [clubId],
    });
  }

  return { leaveClub, hash, isPending, isConfirming, isSuccess, error };
}
