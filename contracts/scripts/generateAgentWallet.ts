import { ethers } from "ethers";
import { getVarsFilePath } from "hardhat/internal/util/global-dir";
import { VarsManager } from "hardhat/internal/core/vars/vars-manager";

async function main() {
  const varsManager = new VarsManager(getVarsFilePath());

  // Check if an agent key was already created to avoid accidental overwrites
  if (varsManager.has("BASE_SEPOLIA_AGENT_KEY")) {
    console.log("ℹ️  BASE_SEPOLIA_AGENT_KEY already exists in Hardhat vars storage.");
    const existingPrivateKey = varsManager.get("BASE_SEPOLIA_AGENT_KEY");
    const wallet = new ethers.Wallet(existingPrivateKey);
    console.log("==================================================");
    console.log("Agent Public Address:", wallet.address);
    console.log("Storage:             Hardhat vars (BASE_SEPOLIA_AGENT_KEY)");
    console.log("Status:              set");
    console.log("==================================================");
    return;
  }

  // Generate completely fresh random wallet
  const newWallet = ethers.Wallet.createRandom();

  // Store in Hardhat vars (never printed or saved to plaintext .env)
  varsManager.set("BASE_SEPOLIA_AGENT_KEY", newWallet.privateKey);

  console.log("==================================================");
  console.log("✅ Generated Fresh Agent Wallet on Base Sepolia");
  console.log("Agent Public Address:", newWallet.address);
  console.log("Storage:             Hardhat vars (BASE_SEPOLIA_AGENT_KEY)");
  console.log("Status:              set");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Failed to generate agent wallet:", err.message);
  process.exit(1);
});
