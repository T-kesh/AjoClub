"use client";

import { useReadContract } from "wagmi";

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useTokenBalance(token: `0x${string}` | undefined, user: `0x${string}` | undefined) {
  return useReadContract({
    address: token,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: user ? [user] : undefined,
    query: { enabled: Boolean(token && user) },
  });
}
