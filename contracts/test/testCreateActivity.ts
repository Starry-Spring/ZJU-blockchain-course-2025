import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EasyBet", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const EasyBet = await ethers.getContractFactory("EasyBet");
    const easyBet = await EasyBet.deploy();

    // 获取 BetToken 合约实例
    const betTokenAddress = await easyBet.betToken();
    const BetToken = await ethers.getContractFactory("BetToken");
    const betToken = BetToken.attach(betTokenAddress);

    return { easyBet, betToken, owner, otherAccount };
  }

  describe("createActivity", function () {
    it("Should create an activity successfully", async function () {
      const { easyBet, owner } = await loadFixture(deployFixture);

      const title = "Test Activity";
      const choices = ["Choice A", "Choice B", "Choice C"];
      const durationInHours = 24;

      // 创建活动 - 直接传递字符串数组，ethers.js 会处理编码
      const tx = await easyBet.createActivity(title, choices, durationInHours);
      await tx.wait();

      // 验证活动数量
      const activitiesCount = await easyBet.getActivitiesCount();
      expect(activitiesCount).to.equal(1);

      // 获取创建的活动信息
      const activity = await easyBet.getActivity(0);
      
      // 验证活动信息
      expect(activity.creator).to.equal(owner.address);
      expect(activity.title).to.equal(title);
      expect(activity.totalPool).to.equal(0);
      expect(activity.isSettled).to.equal(false);
      expect(activity.winningChoice).to.equal(0);
    });


  });
});