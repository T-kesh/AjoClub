import { ethers } from "hardhat";

const RECIPIENT = "0xaEea89C8ac328CAD629f4F7F4F93a3C2cEB0F148";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
];

async function main() {
  console.log("==========================================");
  console.log("🚀 Funding Testnet Account on Base Sepolia");
  console.log("==========================================");
  console.log("Recipient Address:", RECIPIENT);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const signerEth = await ethers.provider.getBalance(signerAddress);
  console.log("Sender Address:   ", signerAddress);
  console.log("Sender ETH:       ", ethers.formatEther(signerEth), "ETH");

  const recipientEthBefore = await ethers.provider.getBalance(RECIPIENT);
  console.log("Recipient ETH before:", ethers.formatEther(recipientEthBefore), "ETH");

  const usdc = new ethers.Contract(BASE_SEPOLIA_USDC, ERC20_ABI, signer);
  let senderUsdc = 0n;
  let recipientUsdcBefore = 0n;
  try {
    senderUsdc = await usdc.balanceOf(signerAddress);
    recipientUsdcBefore = await usdc.balanceOf(RECIPIENT);
    console.log("Recipient USDC before:", ethers.formatUnits(recipientUsdcBefore, 6), "USDC");
  } catch (err) {
    console.log("Could not query USDC balance:", (err as Error).message);
  }

  // 1. Send ETH if sender has enough
  if (signerEth > ethers.parseEther("0.005")) {
    const ethToSend = ethers.parseEther("0.015"); // 0.015 ETH is enough for hundreds of Base Sepolia txs
    console.log("\n1️⃣ Sending 0.015 Base Sepolia ETH for gas...");
    const tx = await signer.sendTransaction({
      to: RECIPIENT,
      value: ethToSend,
    });
    console.log("   ETH Tx Hash:", tx.hash);
    await tx.wait();
    console.log("   ✅ ETH transfer confirmed!");
  } else {
    console.log("⚠️ Sender ETH balance too low to send 0.015 ETH.");
  }

  // 2. Send USDC if sender has USDC
  if (senderUsdc > 1_000_000n) {
    const usdcToSend = senderUsdc > 50_000_000n ? 50_000_000n : senderUsdc / 2n;
    console.log(`\n2️⃣ Sending ${ethers.formatUnits(usdcToSend, 6)} USDC...`);
    const tx = await usdc.transfer(RECIPIENT, usdcToSend);
    console.log("   USDC Tx Hash:", tx.hash);
    await tx.wait();
    console.log("   ✅ USDC transfer confirmed!");
  } else {
    console.log("Sender has no excess test USDC to send.");
  }

  const recipientEthAfter = await ethers.provider.getBalance(RECIPIENT);
  console.log("\n🎉 Final Recipient ETH:", ethers.formatEther(recipientEthAfter), "ETH");
  try {
    const recipientUsdcAfter = await usdc.balanceOf(RECIPIENT);
    console.log("🎉 Final Recipient USDC:", ethers.formatUnits(recipientUsdcAfter, 6), "USDC");
  } catch {}
}

main().catch((err) => {
  console.error("Error executing fundRecipient:", err);
  process.exit(1);
});
