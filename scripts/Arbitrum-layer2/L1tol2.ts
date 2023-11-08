import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import { SigningKey, Wallet } from "ethers";
import { hexDataLength } from '@ethersproject/bytes';
import { L1ToL2MessageGasEstimator } from '@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator';
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies');
import { L1TransactionReceipt, L1ToL2MessageStatus } from '@arbitrum/sdk';
require('dotenv').config();

const walletPrivateKey = process.env.PRIVATE_KEY?.toString();
const l1Provider = new ethers.JsonRpcProvider(`https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`);
const l2Provider = new ethers.JsonRpcProvider('https://rinkeby.arbitrum.io/rpc');

const l1Wallet = new Wallet(walletPrivateKey, l1Provider);
const l2Wallet = new Wallet(walletPrivateKey, l2Provider);

// Address of the Arbitrum_rinkeby Inbox on the L1 chain
const INBOX_ADDR = '0x578bade599406a8fe3d24fd7f7211c0911f5b29e'; // rinkeby -> Arbitrum_one

async function main() {
  const L1Greeter = (await ethers.getContractFactory('GreeterL1')).connect(l1Wallet); //
  console.log('Deploying L1 Greeter 👋');
  const l1Greeter = await L1Greeter.deploy(
    'Hello world in L1',
    ethers.constants.AddressZero,
    INBOX_ADDR
  );
  await l1Greeter.deployed();
  console.log(`deployed to ${l1Greeter.address}`);
  const L2Greeter = (await ethers.getContractFactory('GreeterL2')).connect(l2Wallet);

  console.log('Deploying L2 Greeter 👋👋');

  const l2Greeter = await L2Greeter.deploy(
    'Hello world in L2',
    ethers.constants.AddressZero
  );
  await l2Greeter.deployed();
  console.log(`deployed to ${l2Greeter.address}`);

  const updateL1Tx = await l1Greeter.updateL2Target(l2Greeter.address);
  await updateL1Tx.wait();

  const updateL2Tx = await l2Greeter.updateL1Target(l1Greeter.address);
  await updateL2Tx.wait();
  console.log('Counterpart contract addresses set in both greeters 👍');

  const currentL2Greeting = await l2Greeter.greet();
  console.log(`Current L2 greeting: "${currentL2Greeting}"`);

  console.log('Updating greeting from L1 to L2:');
  const newGreeting = 'Greeting from far, far away';
  const newGreetingBytes = ethers.defaultAbiCoder.encode(['string'], [newGreeting]);
  const newGreetingBytesLength = hexDataLength(newGreetingBytes) + 4; // 4 bytes func identifier
  const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider);

  const _submissionPriceWei = await l1ToL2MessageGasEstimate.estimateSubmissionPrice(
    l1Provider,
    await l1Provider.getGasPrice(),
    newGreetingBytesLength
  );

  console.log(`Current retryable base submission price: ${_submissionPriceWei.toString()}`);
  const submissionPriceWei = _submissionPriceWei.mul(5);
  const gasPriceBid = await l2Provider.getGasPrice();
  console.log(`L2 gas price: ${gasPriceBid.toString()}`);

  const ABI = ['function setGreeting(string _greeting)'];
  const iface = new ethers.utils.Interface(ABI);
  const calldata = iface.encodeFunctionData('setGreeting', [newGreeting]);

  const maxGas = await l1ToL2MessageGasEstimate.estimateRetryableTicketMaxGas(
    l1Greeter.address,
    ethers.parseEther('1'),
    l2Greeter.address,
    0,
    submissionPriceWei,
    l2Wallet.address,
    l2Wallet.address,
    100000,
    gasPriceBid,
    calldata
  );

  const callValue = submissionPriceWei.add(gasPriceBid.mul(maxGas));

  console.log(`Sending greeting to L2 with ${callValue.toString()} callValue for L2 fees:`);

  const setGreetingTx = await l1Greeter.setGreetingInL2(
    newGreeting, // string memory _greeting,
    submissionPriceWei,
    maxGas,
    gasPriceBid,
    {
      value: callValue,
    }
  );
  const setGreetingRec = await setGreetingTx.wait();

  console.log(`Greeting txn confirmed on L1! 🙌 ${setGreetingRec.transactionHash}`);

  const l1TxReceipt = new L1TransactionReceipt(setGreetingRec);

  const message = await l1TxReceipt.getL1ToL2Message(l2Wallet);
  const status = await message.waitForStatus();
  console.log(status);
  if (status === L1ToL2MessageStatus.REDEEMED) {
    console.log(`L2 retryable txn executed 🥳 ${message.l2TxHash}`);
  } else {
    console.log(`L2 retryable txn failed with status ${L1ToL2MessageStatus[status]}`);
  }

  const newGreetingL2 = await l2Greeter.greet();
  console.log(`Updated L2 greeting: "${newGreetingL2}"`);
  console.log('✌️'); 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});