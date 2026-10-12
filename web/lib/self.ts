import { SelfAppBuilder } from "@selfxyz/qrcode";

export function getSelfEndpoint(): string {
  if (process.env.NEXT_PUBLIC_SELF_ENDPOINT) {
    return process.env.NEXT_PUBLIC_SELF_ENDPOINT;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/verify/self`;
  }
  return "https://ajoclub.xyz/api/verify/self";
}

export function buildSelfApp(userAddress: string) {
  if (!userAddress) return null;

  const endpoint = getSelfEndpoint();

  try {
    return new SelfAppBuilder({
      appName: "AjoClub",
      scope: "ajo-club",
      endpoint,
      userId: userAddress,
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
