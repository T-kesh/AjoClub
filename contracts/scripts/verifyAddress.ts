import { ethers } from "hardhat";

const AJO_CLUB_ADDRESS = process.env.AJO_CLUB_CONTRACT_ADDRESS || "0xaD5a169267f0FA9F1D59716F10973B6450853B95";
const TARGET_ADDRESS = "0xaEea89C8ac328CAD629f4F7F4F93a3C2cEB0F148";

async function main() {
  console.log("==========================================");
  console.log("🛡️ Verifying Address on Base Sepolia");
  console.log("==========================================");
  console.log("Target Address:  ", TARGET_ADDRESS);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log("Signer (Owner):  ", signerAddress);

  const ajoClub = await ethers.getContractAt("AjoClub", AJO_CLUB_ADDRESS, signer);

  const isVerifiedBefore = await ajoClub.isVerified(TARGET_ADDRESS);
  console.log("Verified before: ", isVerifiedBefore);

  if (isVerifiedBefore) {
    console.log("Address is already verified!");
    return;
  }

  console.log("Calling setVerified(target, true)...");
  const tx = await ajoClub.setVerified(TARGET_ADDRESS, true);
  console.log("Tx Hash:", tx.hash);
  await tx.wait();
  console.log("✅ Confirmed!");

  const isVerifiedAfter = await ajoClub.isVerified(TARGET_ADDRESS);
  console.log("Verified after:  ", isVerifiedAfter);
}

main().catch((err) => {
  console.error("Error verifying address:", err);
  process.exit(1);
});
