import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account balance:", (await deployer.getAddress()).toString());

  //Deploy MyToken
  const TokenContractFactory = await ethers.getContractFactory("MyToken");
  const tokenContract = await TokenContractFactory.deploy("MyToken", "MT", 1, 100000000);
  await tokenContract.waitForDeployment();

  console.log("auction Contract deployed at :", tokenContract.address)
    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});