import { ethers, network } from "hardhat";
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
  console.log("🚀 Step 4: Prove Real On-Chain Contribution on Base Sepolia");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer Address:", deployerAddress);

  // Retrieve Agent Signer from Hardhat Vars
  const varsManager = new VarsManager(getVarsFilePath());
  const agentKey = varsManager.get("BASE_SEPOLIA_AGENT_KEY");
  const agentSigner = new ethers.Wallet(agentKey, ethers.provider);
  const agentAddress = agentSigner.address;
  console.log("Agent Address:   ", agentAddress);

  const ajoClub = await ethers.getContractAt("AjoClub", AJO_CLUB_ADDRESS, deployer);
  const usdcDeployer = new ethers.Contract(BASE_SEPOLIA_USDC, ERC20_ABI, deployer);

  // 1. Verify balances
  const deployerEth = await ethers.provider.getBalance(deployerAddress);
  const agentEth = await ethers.provider.getBalance(agentAddress);
  const deployerUsdc = await usdcDeployer.balanceOf(deployerAddress);

  console.log("\n1️⃣ Current Balances:");
  console.log("   Deployer ETH: ", ethers.formatEther(deployerEth));
  console.log("   Agent ETH:    ", ethers.formatEther(agentEth));
  console.log("   Deployer USDC:", ethers.formatUnits(deployerUsdc, 6), "USDC");

  if (deployerUsdc < 1_000_000n) {
    throw new Error("Deployer has insufficient USDC for 1 USDC contribution.");
  }

  // 2. Ensure both deployer and agent are Self-verified on contract
  console.log("\n2️⃣ Ensuring accounts are verified in AjoClub contract...");
  const isDeployerVerified = await ajoClub.isVerified(deployerAddress);
  if (!isDeployerVerified) {
    console.log("   Verifying deployer...");
    const tx = await ajoClub.setVerified(deployerAddress, true);
    await tx.wait();
  }

  const isAgentVerified = await ajoClub.isVerified(agentAddress);
  if (!isAgentVerified) {
    console.log("   Verifying agent...");
    const tx = await ajoClub.setVerified(agentAddress, true);
    await tx.wait();
  }
  console.log("   ✅ Both deployer and agent are verified.");

  // 3. Target on-chain Club #1 (Live Base Sepolia Test Chama)
  const testClubId = 1n;
  const clubDataInitial = await ajoClub.getClub(testClubId);
  const contribution = clubDataInitial[2]; // 1 USDC
  console.log(`\n3️⃣ Targeting On-Chain Circle: Club #${testClubId} ("${clubDataInitial[0]}")`);
  console.log(`   Contribution: ${ethers.formatUnits(contribution, 6)} USDC`);

  // 4. Enroll members (deployer + agent)
  console.log("\n4️⃣ Enrolling members into Club #" + testClubId + "...");
  const joinTx1 = await ajoClub.joinClub(testClubId);
  await joinTx1.wait();
  console.log("   ✅ Deployer joined club.");

  const ajoClubAgent = ajoClub.connect(agentSigner);
  const joinTx2 = await ajoClubAgent.joinClub(testClubId);
  await joinTx2.wait();
  console.log("   ✅ Agent joined club.");

  // 5. Start the club
  console.log("\n5️⃣ Starting Club #" + testClubId + "...");
  const startTx = await ajoClub.startClub(testClubId);
  await startTx.wait();
  console.log("   ✅ Club #" + testClubId + " is now ACTIVE on-chain!");

  // 6. Transfer 1 USDC from deployer to agent so both have USDC
  console.log("\n6️⃣ Funding Agent with 1 USDC...");
  const transferTx = await usdcDeployer.transfer(agentAddress, contribution);
  await transferTx.wait();
  console.log("   ✅ Transferred 1 USDC to Agent:", transferTx.hash);

  // 7. Approve USDC from Deployer and call contribute()
  console.log("\n7️⃣ Executing Real On-Chain contribute() from Deployer...");
  const approveTx1 = await usdcDeployer.approve(AJO_CLUB_ADDRESS, contribution);
  await approveTx1.wait();
  console.log("   ✅ Approved 1 USDC to AjoClub contract");

  const contributeTx = await ajoClub.contribute(testClubId);
  console.log("   Submitted contribute() Tx Hash:", contributeTx.hash);
  const contributeReceipt = await contributeTx.wait();

  console.log("   ✅ Confirmed in Block:       ", contributeReceipt.blockNumber);
  console.log("   Gas Used:                    ", contributeReceipt.gasUsed.toString());
  console.log("   Tx Hash on Base Sepolia:     ", contributeTx.hash);

  // 8. Also have Agent contribute so round is 100% funded and ready for payout
  console.log("\n8️⃣ Agent contributing 1 USDC to round...");
  const usdcAgent = new ethers.Contract(BASE_SEPOLIA_USDC, ERC20_ABI, agentSigner);
  const approveTx2 = await usdcAgent.approve(AJO_CLUB_ADDRESS, contribution);
  await approveTx2.wait();
  const contributeTx2 = await ajoClubAgent.contribute(testClubId);
  await contributeTx2.wait();
  console.log("   ✅ Agent contribute() confirmed on-chain:", contributeTx2.hash);

  // 9. Read-back verification via on-chain view functions
  console.log("\n9️⃣ Verifying On-Chain State View Functions...");
  const deployerPaid = await ajoClub.hasPaid(testClubId, deployerAddress);
  const agentPaid = await ajoClub.hasPaid(testClubId, agentAddress);
  const clubData = await ajoClub.getClub(testClubId);
  const [members, paymentStatuses] = await ajoClub.getMemberPaymentStatus(testClubId);
  const contractUsdcBalance = await usdcDeployer.balanceOf(AJO_CLUB_ADDRESS);

  console.log("   Deployer hasPaid():    ", deployerPaid);
  console.log("   Agent hasPaid():       ", agentPaid);
  console.log("   Club Current Round:    ", clubData[6].toString());
  console.log("   Cycle End Timestamp:   ", clubData[7].toString());
  console.log("   Contract USDC Balance: ", ethers.formatUnits(contractUsdcBalance, 6), "USDC");
  console.log("   Payment Statuses:      ", paymentStatuses);

  console.log("\n==================================================");
  console.log("🎉 STEP 4 VERIFICATION COMPLETE: Real Contribution Succeeded!");
  console.log("On-Chain Club ID:       ", testClubId.toString());
  console.log("Deployer Contribute Tx: ", contributeTx.hash);
  console.log("Agent Contribute Tx:    ", contributeTx2.hash);
  console.log("Basescan Link:           https://sepolia.basescan.org/tx/" + contributeTx.hash);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Step 4 Failed:", err);
  process.exit(1);
});
