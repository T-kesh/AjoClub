import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { createPublicClient } from "viem";

export const chain = baseSepolia;

export const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC ?? "https://sepolia.base.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
});

export async function waitForTransactionReceipt({ hash }: { hash: `0x${string}` }) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({ target: "metaMask" }),
    coinbaseWallet({
      appName: "AjoClub",
      preference: "all",
    }),
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(rpcUrl),
  },
  ssr: true,
});
