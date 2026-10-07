import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  const mainnetProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const sepoliaProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");

  const mainnetEth = await mainnetProvider.getBalance(address);
  const sepoliaEth = await sepoliaProvider.getBalance(address);

  console.log("-----------------------------------------");
  console.log("Deployer Address:        ", address);
  console.log("Base Sepolia ETH Balance:", ethers.formatEther(sepoliaEth), "ETH");
  console.log("Base Mainnet ETH Balance:", ethers.formatEther(mainnetEth), "ETH");
  console.log("-----------------------------------------");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
