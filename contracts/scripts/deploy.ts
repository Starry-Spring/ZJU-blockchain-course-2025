import { ethers } from "hardhat";
// import { artifacts } from "hardhat";
// import fs from "fs";

async function main() {
  // 1. 获取部署者账户，从本地钱包或节点获取账户信息
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 2. 部署 EasyBet 合约
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = await EasyBet.deploy();   // 发送部署交易
  await easyBet.deployed();   // 等待交易被确认与部署完成

  console.log(`✅ EasyBet deployed to ${easyBet.address}`);

  // 3. 获取 BetToken 地址
  const betTokenAddress = await easyBet.betToken();   // 读取合约状态与区块链调用
  console.log(`✅ BetToken deployed to: ${betTokenAddress}`);

  // 4. 保存合约地址到文件，供前端使用
  const fs = require('fs');
  const contractsDir = __dirname + "../../../frontend/src/contracts/";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({
      EasyBet: easyBet.address,
      BetToken: betTokenAddress
    }, undefined, 2)
  );
  console.log("💾 合约地址已保存");

  // 5. 保存合约 ABI
  const saveAbi = (contractName: string) => {
    // 所有合约的 artifact 都在 EasyBet.sol 目录下
    const artifactPath = `../artifacts/contracts/EasyBet.sol/${contractName}.json`;
    
    const artifact = require(artifactPath);
    fs.writeFileSync(
      `${contractsDir}/${contractName}.json`,
      JSON.stringify({
        abi: artifact.abi,
        bytecode: artifact.bytecode
      }, null, 2)
    );
    console.log(`✅ ${contractName} ABI saved`);
  };

  saveAbi("EasyBet");
  saveAbi("BetToken");

  console.log("Contract addresses and ABIs saved to frontend directory!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});