import { celo, celoAlfajores } from "viem/chains";
import { defineChain } from "viem";
import { createConfig, http } from "wagmi";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 42220);
const rpc = process.env.NEXT_PUBLIC_CELO_RPC ?? "https://forno.celo.org";

const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
    public: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
  },
  testnet: true,
});

export const chain =
  chainId === 44787 ? celoAlfajores
  : chainId === 11142220 ? celoSepolia
  : celo;

export const wagmiConfig = createConfig({
  chains: [chain],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transports: { [chain.id]: http(rpc) } as any,
});
