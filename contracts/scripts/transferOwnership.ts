import { ethers } from "hardhat";

const CONTRACT   = "0x650CF9Ac5e303d074906d1e8eb05474A492936DC";
const NEW_OWNER  = "0xaEea89C8ac328CAD629f4F7F4F93a3C2cEB0F148";
const EXPECTED   = "0xF70A7e9d56e3b6532FE057d58d49104cB2Db53Bd";

async function main() {
  if (process.env.CONFIRM !== "yes") {
    console.error('Set CONFIRM=yes to proceed. e.g.:');
    console.error('  CONFIRM=yes npx hardhat run scripts/transferOwnership.ts --network celo');
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const abi = [
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner)",
  ];
  const contract = new ethers.Contract(CONTRACT, abi, signer);

  const current = await contract.owner();
  console.log("\nCurrent owner:", current);
  console.log("Expected:     ", EXPECTED);

  if (current.toLowerCase() !== EXPECTED.toLowerCase()) {
    console.error("ERROR: current owner does not match expected. Aborting.");
    process.exit(1);
  }

  console.log("\nNew owner:    ", NEW_OWNER);
  console.log("\nSending transferOwnership...");

  const tx = await contract.transferOwnership(NEW_OWNER);
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Confirmed.");

  const after = await contract.owner();
  console.log("\nOwner after:", after);
  if (after.toLowerCase() !== NEW_OWNER.toLowerCase()) {
    console.error("ERROR: owner did not update as expected.");
    process.exit(1);
  }
  console.log("✓ Ownership transferred successfully.");
}

main().catch((e) => { console.error(e); process.exit(1); });
