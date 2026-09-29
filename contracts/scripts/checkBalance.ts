import { ethers, network } from "hardhat";

async function main() {
  console.log("🔗 Connecting to network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured for network " + network.name);
  }

  const address = await deployer.getAddress();
  const provider = ethers.provider;
  const networkDetails = await provider.getNetwork();
  const balanceWei = await provider.getBalance(address);
  const balanceEth = ethers.formatEther(balanceWei);

  console.log("==================================================");
  console.log("Network Name:    ", network.name);
  console.log("Chain ID:        ", networkDetails.chainId.toString());
  console.log("Deployer Address:", address);
  console.log("Current Balance: ", balanceEth, "ETH");
  console.log("==================================================");

  if (balanceWei === 0n) {
    console.log("ℹ️  Wallet is ready and verified against RPC, currently un-funded (0 ETH).");
  } else {
    console.log("✅ Wallet has funds available.");
  }
}

main().catch((error) => {
  console.error("❌ Connectivity check failed:", error);
  process.exitCode = 1;
});
