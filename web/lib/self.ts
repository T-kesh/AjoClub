import { SelfAppBuilder } from "@selfxyz/qrcode";

export function getSelfEndpoint(): string {
  const envEndpoint = process.env.NEXT_PUBLIC_SELF_ENDPOINT;
  if (
    envEndpoint &&
    !envEndpoint.includes("localhost") &&
    !envEndpoint.includes("127.0.0.1")
  ) {
    return envEndpoint;
  }
  // If running in browser and NOT localhost, use current origin with https
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      !origin.includes("localhost") &&
      !origin.includes("127.0.0.1") &&
      origin.startsWith("https://")
    ) {
      return `${origin}/api/verify/self`;
    }
  }
  // SelfAppBuilder strictly requires an HTTPS non-localhost endpoint
  return "https://ajoclub.xyz/api/verify/self";
}

export function buildSelfApp(userAddress: string) {
  if (!userAddress || !userAddress.startsWith("0x")) return null;

  const endpoint = getSelfEndpoint();

  try {
    return new SelfAppBuilder({
      appName: "AjoClub",
      scope: "ajo-club",
      endpoint,
      userId: userAddress,
      userIdType: "hex", // Required for 0x Ethereum addresses
      disclosures: {
        minimumAge: 18,
        ofac: false,
      },
    }).build();
  } catch (error) {
    console.error("Failed to build SelfApp configuration:", error);
    return null;
  }
}
