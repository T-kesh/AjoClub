import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// IdentityVerificationHub proxy addresses (from Self Protocol registry)
const HUB = {
  "celo-sepolia": "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  celo:           "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",
};

const SCOPE_SEED = "ajo-club";

const AjoClubModule = buildModule("AjoClubModule", (m) => {
  const network = process.env.HARDHAT_NETWORK ?? "celo-sepolia";
  const hub = HUB[network as keyof typeof HUB] ?? HUB["celo-sepolia"];

  const ajoClub = m.contract("AjoClub", [hub, SCOPE_SEED]);
  return { ajoClub };
});

export default AjoClubModule;
