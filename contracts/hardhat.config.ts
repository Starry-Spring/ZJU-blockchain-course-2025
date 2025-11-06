import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://127.0.0.1:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0x51c80d4ecb2fef2f2bb3ac66d68f15c16776a32d40fb356f5a415a1d5e3adccc',
        '0x1440799e4302a9b50a89ed789a256075cc7124f288937db02ad140b5eb17e307',
        '0x02271e7b96000c2e34ac0b3bd46fc5a76cda812adc4c2c3bf20b0c1d6154bf91'
      ]
    },
  },

  // // 添加正确的路径配置
  // paths: {
  //   sources: "./contracts", // 指向包含 .sol 文件的子目录
  //   tests: "./test",
  //   cache: "./cache",
  //   artifacts: "./artifacts"
  // },
};

export default config;
