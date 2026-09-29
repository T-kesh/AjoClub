import { ethers, network } from "hardhat";

const AJO_CLUB_ADDRESS = "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  console.log("==================================================");
  console.log("🧪 AjoClub On-Chain Smoke Test — Base Sepolia");
  console.log("==================================================");
  console.log("Network:         ", network.name);
  console.log("Contract Address:", AJO_CLUB_ADDRESS);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const initialBalance = await ethers.provider.getBalance(signerAddress);
  console.log("Signer:          ", signerAddress);
  console.log("Current Balance: ", ethers.formatEther(initialBalance), "ETH");

  const ajoClub = await ethers.getContractAt("AjoClub", AJO_CLUB_ADDRESS, signer);

  // 1. Read-Only View Checks
  console.log("\n1️⃣ Checking Read-Only State Functions...");
  const owner = await ajoClub.owner();
  const initialCount = await ajoClub.clubCount();
  const isUsdcAllowed = await ajoClub.allowedTokens(BASE_SEPOLIA_USDC);

  console.log("   Contract Owner:   ", owner);
  console.log("   Current Club Count:", initialCount.toString());
  console.log("   USDC Allowed:     ", isUsdcAllowed);

  if (!isUsdcAllowed) {
    throw new Error("Base Sepolia USDC is unexpectedly not allowed.");
  }

  // 2. State Mutating Test (createClub if not already created)
  if (initialCount === 0n) {
    console.log("\n2️⃣ Executing On-Chain State Mutation: createClub()...");
    const clubName = "Base Sepolia Pilot Circle";
    const contributionUsdc = ethers.parseUnits("25", 6); // 25 USDC (6 decimals)
    const cycleSeconds = 7 * 24 * 3600; // 7 days
    const graceSeconds = 24 * 3600;     // 24 hours
    const maxMembers = 3;

    const tx = await ajoClub.createClub(
      clubName,
      BASE_SEPOLIA_USDC,
      contributionUsdc,
      cycleSeconds,
      graceSeconds,
      maxMembers
    );

    console.log("   Submitted Tx Hash:", tx.hash);
    console.log("   Waiting for confirmation on Base Sepolia...");

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt not found.");
    }

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.gasPrice ?? tx.gasPrice ?? 0n;
    const feeEth = ethers.formatEther(receipt.fee ?? (gasUsed * gasPrice));

    console.log("   ✅ Confirmed in Block: ", receipt.blockNumber);
    console.log("   Gas Used:              ", gasUsed.toString());
    console.log("   Effective Gas Price:   ", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("   Tx Cost:               ", feeEth, "ETH");
  } else {
    console.log("\n2️⃣ On-Chain club #0 already created on Base Sepolia! Skipping duplicate creation.");
  }

  // 3. Verify Updated State
  console.log("\n3️⃣ Verifying Post-Execution State...");
  const newCount = await ajoClub.clubCount();
  console.log("   New Club Count:        ", newCount.toString());

  const createdClub = await ajoClub.getClub(0);
  console.log("   Retrieved Club ID:      0");
  console.log("   Club Name:             ", createdClub[0]);
  console.log("   Token Address:         ", createdClub[1]);
  console.log("   Contribution:          ", ethers.formatUnits(createdClub[2], 6), "USDC");
  console.log("   Cycle Duration:        ", createdClub[3].toString(), "seconds");
  console.log("   Grace Period:          ", createdClub[4].toString(), "seconds");
  console.log("   Max Members:           ", createdClub[5].toString());
  console.log("   Status:                ", ["OPEN", "ACTIVE", "COMPLETE", "CANCELLED"][Number(createdClub[8])]);

  const finalBalance = await ethers.provider.getBalance(signerAddress);
  console.log("\n==================================================");
  console.log("🎉 ON-CHAIN SMOKE TEST PASSED 100%");
  console.log("==================================================");
  console.log("Final Wallet Balance:  ", ethers.formatEther(finalBalance), "ETH");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exitCode = 1;
});
