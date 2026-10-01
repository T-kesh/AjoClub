import { ethers } from "hardhat";
import { getVarsFilePath } from "hardhat/internal/util/global-dir";
import { VarsManager } from "hardhat/internal/core/vars/vars-manager";

const AJO_CLUB_ADDRESS = "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
];

async function main() {
  console.log("==================================================");
  console.log("🧪 Direct On-Chain Interaction (Bypassing Bot)");
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

  // 1. Create a fresh on-chain club
  const clubName = "Live Indexer Verification Club";
  const contribution = 1_000_000n; // 1.0 USDC
  const cycleDuration = 86400; // 24 hours
  const gracePeriod = 86400;   // 24 hours
  const maxMembers = 2;

  console.log("\n1️⃣ Calling createClub() on Base Sepolia...");
  const createTx = await ajoClub.createClub(
    clubName,
    BASE_SEPOLIA_USDC,
    contribution,
    cycleDuration,
    gracePeriod,
    maxMembers
  );
  console.log("   createClub Tx:", createTx.hash);
  const createReceipt = await createTx.wait();
  console.log("   Confirmed in block:", createReceipt?.blockNumber);

  const clubCount = await ajoClub.clubCount();
  const newClubId = clubCount - 1n;
  console.log(`   ✅ Created on-chain Club ID: #${newClubId}`);

  // 2. Both join
  console.log(`\n2️⃣ Joining Club #${newClubId}...`);
  const joinTx1 = await ajoClub.joinClub(newClubId);
  await joinTx1.wait();
  console.log("   ✅ Deployer joined");

  const ajoClubAgent = ajoClub.connect(agentSigner);
  const joinTx2 = await ajoClubAgent.joinClub(newClubId);
  await joinTx2.wait();
  console.log("   ✅ Agent joined");

  // 3. Start club
  console.log(`\n3️⃣ Starting Club #${newClubId}...`);
  const startTx = await ajoClub.startClub(newClubId);
  await startTx.wait();
  console.log("   ✅ Club started (ACTIVE)!");

  // 4. Deployer approves and calls contribute() directly
  console.log(`\n4️⃣ Executing direct contribute() on Base Sepolia...`);
  const approveTx = await usdcDeployer.approve(AJO_CLUB_ADDRESS, contribution);
  await approveTx.wait();
  console.log("   ✅ Approved 1 USDC");

  const contributeTx = await ajoClub.contribute(newClubId);
  console.log("   Submitted contribute() Tx Hash:", contributeTx.hash);
  const contributeReceipt = await contributeTx.wait();
  console.log("   ✅ Confirmed in block:", contributeReceipt?.blockNumber);

  console.log("\n==================================================");
  console.log("🎉 Direct On-Chain contribute() Complete!");
  console.log("Club ID:          ", newClubId.toString());
  console.log("Contribute Tx:    ", contributeTx.hash);
  console.log("Basescan Explorer:", `https://sepolia.basescan.org/tx/${contributeTx.hash}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Direct execution failed:", err);
  process.exit(1);
});
