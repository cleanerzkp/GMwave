const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WavePortal", function () {
  let wavePortal;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    const WavePortal = await ethers.getContractFactory("WavePortal");
    [owner, addr1, addr2] = await ethers.getSigners();
    wavePortal = await WavePortal.deploy();
    await wavePortal.deployed();

    // Send 1 Ether to the contract
    await owner.sendTransaction({ to: wavePortal.address, value: ethers.utils.parseEther("1") });
  });

  it("should set the total waves to 0 initially", async function () {
    expect(await wavePortal.getTotalWaves()).to.equal(0);
  });

  it("should increase the total waves when a user waves", async function () {
    await wavePortal.connect(addr1).wave("Hello!");
    expect(await wavePortal.getTotalWaves()).to.equal(1);
  });

  it("should emit a NewWave event when a user waves", async function () {
    await wavePortal.connect(addr1).wave("Hello!");

    const waveTxn = await wavePortal.connect(addr1).wave("Hello!");
    const receipt = await waveTxn.wait();

    const waveEvent = receipt.events.find((event) => event.event === "NewWave");
  
    expect(waveEvent).to.exist;  // Make sure the event exists
    expect(waveEvent.args.from).to.equal(addr1.address);
    expect(waveEvent.args.message).to.equal("Hello!");
  });

  it("should distribute prize to user every 5th wave", async function () {
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    for (let i = 0; i < 5; i++) {
      await wavePortal.connect(addr1).wave("Hello!");
      await ethers.provider.send("evm_increaseTime", [15 * 60]); // Increase time by waveCooldown
      await ethers.provider.send("evm_mine"); // Mine a new block
    }

    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance).to.be.above(initialBalance);
  });

  it("should return all waves when getAllWaves is called", async function () {
    await wavePortal.connect(addr1).wave("Wave 1");
    await ethers.provider.send("evm_increaseTime", [15 * 60]);
    await ethers.provider.send("evm_mine");

    await wavePortal.connect(addr2).wave("Wave 2");
    await ethers.provider.send("evm_increaseTime", [15 * 60]);
    await ethers.provider.send("evm_mine");

    const allWaves = await wavePortal.getAllWaves();
    expect(allWaves.length).to.equal(2);
  });

  it("should change waveCooldown when owner calls setWaveCooldown", async function () {
    await wavePortal.connect(owner).setWaveCooldown(30 * 60);
    expect(await wavePortal.waveCooldown()).to.equal(30 * 60);
  });

  it("should revert when non-owner attempts to call setWaveCooldown", async function () {
    await expect(wavePortal.connect(addr1).setWaveCooldown(30 * 60)).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
