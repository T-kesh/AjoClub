import { ethers } from "hardhat";

async function main() {
  const c = await ethers.getContractAt("AjoClub", "0x650CF9Ac5e303d074906d1e8eb05474A492936DC");
  const id = await c.verificationConfigId();
  const zero = "0x" + "0".repeat(64);
  console.log("verificationConfigId:", id);
  console.log("non-zero:", id !== zero);
}
main().catch(console.error);
