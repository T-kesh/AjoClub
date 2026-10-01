import { ethers } from "hardhat";
import { getVarsFilePath } from "hardhat/internal/util/global-dir";
import { VarsManager } from "hardhat/internal/core/vars/vars-manager";

const AJO_CLUB_ADDRESS = "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

async function main() {
  console.log("==================================================");
  console.log("🚀 Completing Join, Start, and Contribute on Club #2");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const varsManager = new VarsManager(getVarsFilePath());
  const agentKey = varsManager.get("BASE_SEPOLIA_AGENT_KEY");
  const agentSigner = new ethers.Wallet(agentKey, ethers.provider);
  const agentAddress = agentSigner.address;
  console.log("Agent:   ", agentAddress);

  const ajoClub = await ethers.getContractAt("AjoClub", AJO_CLUB_ADDRESS, deployer);
  const usdcDeployer = new ethers.Contract(BASE_SEPOLIA_USDC, ERC20_ABI, deployer);

  const clubId = 2n;

  // 1. Deployer joins Club #2
  console.log(`\n1️⃣ Deployer joining Club #${clubId}...`);
  const joinTx1 = await ajoClub.joinClub(clubId);
  await joinTx1.wait();
  console.log("   ✅ Deployer joined (Tx:", joinTx1.hash, ")");

  // 2. Agent joins Club #2
  console.log(`\n2️⃣ Agent joining Club #${clubId}...`);
  const ajoClubAgent = ajoClub.connect(agentSigner);
  const joinTx2 = await ajoClubAgent.joinClub(clubId);
  await joinTx2.wait();
  console.log("   ✅ Agent joined (Tx:", joinTx2.hash, ")");

  // 3. Deployer starts Club #2
  console.log(`\n3️⃣ Starting Club #${clubId}...`);
  const startTx = await ajoClub.startClub(clubId);
  await startTx.wait();
  console.log("   ✅ Club #2 is now ACTIVE on-chain! (Tx:", startTx.hash, ")");

  // 4. Deployer approves and calls contribute()
  console.log(`\n4️⃣ Deployer executing real contribute() on Club #${clubId}...`);
  const contribution = 1_000_000n; // 1 USDC
  const approveTx = await usdcDeployer.approve(AJO_CLUB_ADDRESS, contribution);
  await approveTx.wait();
  console.log("   ✅ Approved 1 USDC");

  const contributeTx = await ajoClub.contribute(clubId);
  console.log("   Submitted contribute() Tx Hash:", contributeTx.hash);
  const receipt = await contributeTx.wait();
  console.log("   ✅ Confirmed in Block: ", receipt?.blockNumber);

  console.log("\n==================================================");
  console.log("🎉 Fresh contribute() Completed Successfully!");
  console.log("Club ID:          ", clubId.toString());
  console.log("Contribute Tx:    ", contributeTx.hash);
  console.log("Basescan Link:    ", `https://sepolia.basescan.org/tx/${contributeTx.hash}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
