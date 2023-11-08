import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Account balance:", (await deployer.getAddress()).toString());

  //Deploy MyToken
  const TokenContractFactory = await ethers.getContractFactory("WithdrawProxy");
  const tokenContract = await TokenContractFactory.deploy();
  await tokenContract.waitForDeployment();

  console.log("auction Contract deployed at :", tokenContract.address)

  let messageBytes = ethers.toUtf8Bytes("");
  await tokenContract.withdraw("0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000", ethers.parseEther("0.0001"),0,messageBytes);
    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});