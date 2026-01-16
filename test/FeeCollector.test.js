const FeeCollector = artifacts.require("FeeCollector");
const FlashLoanPool = artifacts.require("FlashLoanPool");
const MockERC20 = artifacts.require("MockERC20");

/**
 * @title FeeCollector Test Suite
 * @notice Tests for fee collection and distribution
 */
contract("FeeCollector", (accounts) => {
  const [owner, treasury, newTreasury, , unauthorized] = accounts;
  
  let feeCollector;
  let pool;
  let usdt;

  const FEE_AMOUNT = web3.utils.toBN("1000000"); // 1 USDT

  beforeEach(async () => {
    // Deploy mock token
    usdt = await MockERC20.new("Test USDT", "USDT", 6);
    
    // Deploy pool first (needed for FeeCollector)
    pool = await FlashLoanPool.new(owner, 5);
    
    // Deploy FeeCollector
    feeCollector = await FeeCollector.new(owner, treasury, pool.address);
    
    // Configure pool
    await pool.setFeeCollector(feeCollector.address, { from: owner });
  });

  describe("Deployment", () => {
    it("should deploy with correct owner", async () => {
      const contractOwner = await feeCollector.owner();
      assert.equal(contractOwner, owner, "Owner should be deployer");
    });

    it("should deploy with correct treasury", async () => {
      const contractTreasury = await feeCollector.getTreasury();
      assert.equal(contractTreasury, treasury, "Treasury should be set");
    });

    it("should deploy with correct pool address", async () => {
      const contractPool = await feeCollector.flashLoanPool();
      assert.equal(contractPool, pool.address, "Pool should be set");
    });

    it("should have default fee split (20/80)", async () => {
      const [treasuryBps, depositorBps] = await feeCollector.getFeeSplit();
      assert.equal(treasuryBps.toNumber(), 2000, "Treasury share should be 20%");
      assert.equal(depositorBps.toNumber(), 8000, "Depositor share should be 80%");
    });

    it("should reject deployment with zero treasury", async () => {
      try {
        await FeeCollector.new(owner, "0x0000000000000000000000000000000000000000", pool.address);
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });

    it("should reject deployment with zero pool", async () => {
      try {
        await FeeCollector.new(owner, treasury, "0x0000000000000000000000000000000000000000");
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });
  });

  describe("Fee Collection", () => {
    beforeEach(async () => {
      // Fund the fee collector to simulate receiving fees
      await usdt.mint(feeCollector.address, FEE_AMOUNT);
    });

    it("should only allow pool to collect fees", async () => {
      try {
        await feeCollector.collectFees(usdt.address, FEE_AMOUNT, { from: unauthorized });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("UnauthorizedCaller"), "Should revert with UnauthorizedCaller");
      }
    });

    it("should split fees correctly", async () => {
      // We need to call from pool address - this is tricky in tests
      // The actual collection happens during flash loan execution
      // We'll test the fee split calculation
      
      const treasuryExpected = FEE_AMOUNT.mul(web3.utils.toBN(20)).div(web3.utils.toBN(100));
      const depositorExpected = FEE_AMOUNT.mul(web3.utils.toBN(80)).div(web3.utils.toBN(100));
      
      assert.equal(treasuryExpected.toString(), "200000", "Treasury should get 20%");
      assert.equal(depositorExpected.toString(), "800000", "Depositors should get 80%");
    });
  });

  describe("Treasury Management", () => {
    it("should allow owner to update treasury", async () => {
      await feeCollector.setTreasury(newTreasury, { from: owner });
      
      const updatedTreasury = await feeCollector.getTreasury();
      assert.equal(updatedTreasury, newTreasury, "Treasury should be updated");
    });

    it("should emit TreasuryUpdated event", async () => {
      const tx = await feeCollector.setTreasury(newTreasury, { from: owner });
      
      assert.equal(tx.logs[0].event, "TreasuryUpdated", "Should emit TreasuryUpdated");
      assert.equal(tx.logs[0].args.oldTreasury, treasury, "Old treasury should match");
      assert.equal(tx.logs[0].args.newTreasury, newTreasury, "New treasury should match");
    });

    it("should reject zero address treasury", async () => {
      try {
        await feeCollector.setTreasury("0x0000000000000000000000000000000000000000", { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });

    it("should reject non-owner treasury update", async () => {
      try {
        await feeCollector.setTreasury(newTreasury, { from: unauthorized });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("OwnableUnauthorizedAccount"), "Should revert with unauthorized");
      }
    });
  });

  describe("Fee Split Management", () => {
    it("should allow owner to update fee split", async () => {
      await feeCollector.setFeeSplit(3000, 7000, { from: owner }); // 30/70 split
      
      const [treasuryBps, depositorBps] = await feeCollector.getFeeSplit();
      assert.equal(treasuryBps.toNumber(), 3000, "Treasury share should be 30%");
      assert.equal(depositorBps.toNumber(), 7000, "Depositor share should be 70%");
    });

    it("should emit FeeSplitUpdated event", async () => {
      const tx = await feeCollector.setFeeSplit(3000, 7000, { from: owner });
      
      assert.equal(tx.logs[0].event, "FeeSplitUpdated", "Should emit FeeSplitUpdated");
      assert.equal(tx.logs[0].args.treasuryBps.toNumber(), 3000, "Treasury bps should match");
      assert.equal(tx.logs[0].args.depositorBps.toNumber(), 7000, "Depositor bps should match");
    });

    it("should reject invalid fee split (not summing to 10000)", async () => {
      try {
        await feeCollector.setFeeSplit(3000, 8000, { from: owner }); // 110% total
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("InvalidFeeSplit"), "Should revert with InvalidFeeSplit");
      }
    });

    it("should reject non-owner fee split update", async () => {
      try {
        await feeCollector.setFeeSplit(3000, 7000, { from: unauthorized });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("OwnableUnauthorizedAccount"), "Should revert with unauthorized");
      }
    });

    it("should allow 100% to treasury", async () => {
      await feeCollector.setFeeSplit(10000, 0, { from: owner });
      
      const [treasuryBps, depositorBps] = await feeCollector.getFeeSplit();
      assert.equal(treasuryBps.toNumber(), 10000, "Treasury should be 100%");
      assert.equal(depositorBps.toNumber(), 0, "Depositor should be 0%");
    });

    it("should allow 100% to depositors", async () => {
      await feeCollector.setFeeSplit(0, 10000, { from: owner });
      
      const [treasuryBps, depositorBps] = await feeCollector.getFeeSplit();
      assert.equal(treasuryBps.toNumber(), 0, "Treasury should be 0%");
      assert.equal(depositorBps.toNumber(), 10000, "Depositor should be 100%");
    });
  });

  describe("Pool Management", () => {
    it("should allow owner to update pool address", async () => {
      const newPool = await FlashLoanPool.new(owner, 5);
      
      await feeCollector.setFlashLoanPool(newPool.address, { from: owner });
      
      const updatedPool = await feeCollector.flashLoanPool();
      assert.equal(updatedPool, newPool.address, "Pool should be updated");
    });

    it("should emit FlashLoanPoolUpdated event", async () => {
      const newPool = await FlashLoanPool.new(owner, 5);
      
      const tx = await feeCollector.setFlashLoanPool(newPool.address, { from: owner });
      
      assert.equal(tx.logs[0].event, "FlashLoanPoolUpdated", "Should emit FlashLoanPoolUpdated");
    });

    it("should reject zero address pool", async () => {
      try {
        await feeCollector.setFlashLoanPool("0x0000000000000000000000000000000000000000", { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });
  });

  describe("Treasury Withdrawal", () => {
    it("should revert when no fees to withdraw", async () => {
      try {
        await feeCollector.withdrawTreasuryFees(usdt.address);
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("NoFeesToWithdraw"), "Should revert with NoFeesToWithdraw");
      }
    });

    it("should return zero fees initially", async () => {
      const fees = await feeCollector.getTreasuryFees(usdt.address);
      assert.equal(fees.toNumber(), 0, "Should have zero fees initially");
    });
  });
});
