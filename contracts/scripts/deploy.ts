import { ethers, network } from "hardhat";

// IdentityVerificationHub proxy addresses from Self Protocol registry
const HUB: Record<string, string> = {
  baseSepolia:    "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  "base-sepolia": "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  base:           "0x6758c0C2A297E6878Bb9294916Afd2d099232977",
  "celo-sepolia": "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74",
  celo:           "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF",
};

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const SCOPE_SEED = "ajo-club";

async function main() {
  console.log("🚀 Starting AjoClub deployment...");
  console.log("Network:  ", network.name);

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer available for network " + network.name);
  }

  const deployerAddress = await deployer.getAddress();
  const balanceBefore = await ethers.provider.getBalance(deployerAddress);
  console.log("Deployer: ", deployerAddress);
  console.log("Balance:  ", ethers.formatEther(balanceBefore), "ETH");

  if (balanceBefore === 0n) {
    throw new Error("Deployer account has 0 ETH. Please fund the wallet before deploying.");
  }

  let hubAddress = HUB[network.name] ?? HUB["base-sepolia"];
  if (hubAddress && hubAddress !== ethers.ZeroAddress) {
    const code = await ethers.provider.getCode(hubAddress);
    if (code === "0x") {
      console.warn(`⚠️  NOTICE: Hub address ${hubAddress} has no deployed bytecode on ${network.name}.`);
      console.warn("   This was a Celo testnet hub address that does not exist on Base Sepolia.");
      console.warn("   Falling back to ethers.ZeroAddress (direct verification mode via Coinbase Verifications / Basename).");
      hubAddress = ethers.ZeroAddress;
    }
  }

  console.log("Self Hub: ", hubAddress);
  console.log("Scope:    ", SCOPE_SEED);

  console.log("\n📦 Deploying AjoClub contract...");
  const AjoClubFactory = await ethers.getContractFactory("AjoClub");
  const ajoClub = await AjoClubFactory.deploy(hubAddress, SCOPE_SEED);

  const deployTx = ajoClub.deploymentTransaction();
  if (!deployTx) {
    throw new Error("Failed to retrieve deployment transaction.");
  }

  console.log("Tx Hash:  ", deployTx.hash);
  console.log("Waiting for confirmation onchain...");

  await ajoClub.waitForDeployment();
  const contractAddress = await ajoClub.getAddress();

  const receipt = await deployTx.wait();
  if (!receipt) {
    throw new Error("Failed to retrieve transaction receipt.");
  }

  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.gasPrice ?? deployTx.gasPrice ?? 0n;
  const actualCostWei = receipt.fee ?? (gasUsed * gasPrice);
  const actualCostEth = ethers.formatEther(actualCostWei);

  const balanceAfter = await ethers.provider.getBalance(deployerAddress);

  console.log("\n==================================================");
  console.log("🎉 AjoClub DEPLOYMENT SUCCESSFUL");
  console.log("==================================================");
  console.log("Contract Address:    ", contractAddress);
  console.log("Deploy Tx Hash:      ", deployTx.hash);
  console.log("Block Number:        ", receipt.blockNumber);
  console.log("Gas Used:            ", gasUsed.toString());
  console.log("Effective Gas Price: ", ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("Actual Deploy Cost:  ", actualCostEth, "ETH");
  console.log("Remaining Balance:   ", ethers.formatEther(balanceAfter), "ETH");
  console.log("==================================================");

  // Post-deploy verification of state
  console.log("\n🔍 Verifying contract state...");
  const usdcAllowed = await ajoClub.allowedTokens(BASE_SEPOLIA_USDC);
  const initialClubCount = await ajoClub.clubCount();
  const owner = await ajoClub.owner();

  console.log("Owner:               ", owner);
  console.log("Initial Club Count:  ", initialClubCount.toString());
  console.log(`USDC (${BASE_SEPOLIA_USDC}) Allowed:`, usdcAllowed);

  if (!usdcAllowed) {
    console.warn("⚠️  WARNING: Base Sepolia USDC is NOT allowlisted on the contract!");
  } else {
    console.log("✅ Base Sepolia USDC (6 decimals) is verified allowlisted.");
  }
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
