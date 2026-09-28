import { SelfAppBuilder } from "@selfxyz/qrcode";

export function buildSelfApp(userAddress: string) {
  const endpoint = process.env.NEXT_PUBLIC_SELF_ENDPOINT;
  if (!endpoint || !userAddress) return null;

  return new SelfAppBuilder({
    appName: "AjoClub",
    scope: "ajo-club",
    endpoint,
    endpointType: process.env.NEXT_PUBLIC_CHAIN_ID === "42220" ? "celo" : "staging_celo",
    userIdType: "hex",
    userId: userAddress,
    version: 2,

  }).build();
}
