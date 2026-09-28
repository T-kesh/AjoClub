import { base, baseSepolia, celo, celoAlfajores } from "viem/chains";
import { createConfig, http } from "wagmi";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532);
const defaultRpc = chainId === 8453 ? "https://mainnet.base.org" : "https://sepolia.base.org";
const rpc = process.env.NEXT_PUBLIC_BASE_RPC ?? process.env.NEXT_PUBLIC_CELO_RPC ?? defaultRpc;

export const chain =
  chainId === 8453 ? base
  : chainId === 84532 ? baseSepolia
  : chainId === 44787 ? celoAlfajores
  : celo;

export const wagmiConfig = createConfig({
  chains: [chain],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transports: { [chain.id]: http(rpc) } as any,
});
