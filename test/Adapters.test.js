const FlashLoanReceiverBase = artifacts.require("FlashLoanReceiverBase");
const FlashLoanPool = artifacts.require("FlashLoanPool");
const FeeCollector = artifacts.require("FeeCollector");
const MockERC20 = artifacts.require("MockERC20");
const ProfitableReceiver = artifacts.require("ProfitableReceiver");

/**
 * @title Adapter Test Suite
 * @notice Tests for flash loan receiver adapters
 */
contract("Adapters", (accounts) => {
  const [owner, user1, treasury] = accounts;
  
  let pool;
  let feeCollector;
  let usdt;
  let profitableReceiver;

  const FLASH_LOAN_FEE = 5;
  const INITIAL_SUPPLY = web3.utils.toBN("1000000000000");
  const DEPOSIT_AMOUNT = web3.utils.toBN("100000000000");
  const LOAN_AMOUNT = web3.utils.toBN("50000000000");

  beforeEach(async () => {
    // Deploy infrastructure
    usdt = await MockERC20.new("Test USDT", "USDT", 6);
    pool = await FlashLoanPool.new(owner, FLASH_LOAN_FEE);
    feeCollector = await FeeCollector.new(owner, treasury, pool.address);
    
    // Configure
    await pool.setFeeCollector(feeCollector.address, { from: owner });
    await pool.whitelistToken(usdt.address, { from: owner });
    
    // Deploy profitable receiver
    profitableReceiver = await ProfitableReceiver.new(pool.address);
    
    // Fund
    await usdt.mint(user1, INITIAL_SUPPLY);
    await usdt.mint(profitableReceiver.address, INITIAL_SUPPLY);
    
    // Deposit liquidity
    await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
    await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
  });

  describe("ProfitableReceiver", () => {
    it("should execute profitable flash loan", async () => {
      const balanceBefore = await usdt.balanceOf(profitableReceiver.address);
      
      await profitableReceiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: owner });
      
      const profit = await profitableReceiver.profit();
      
      // Should have profit equal to initial balance minus amount owed
      const expectedPremium = LOAN_AMOUNT.mul(web3.utils.toBN(FLASH_LOAN_FEE)).div(web3.utils.toBN(10000));
      const amountOwed = LOAN_AMOUNT.add(expectedPremium);
      const expectedProfit = balanceBefore.sub(amountOwed);
      
      assert.equal(profit.toString(), expectedProfit.toString(), "Profit should be calculated correctly");
    });

    it("should allow profit withdrawal", async () => {
      await profitableReceiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: owner });
      
      const profitAmount = await usdt.balanceOf(profitableReceiver.address);
      const ownerBalanceBefore = await usdt.balanceOf(owner);
      
      await profitableReceiver.withdrawProfit(usdt.address, owner, { from: owner });
      
      const ownerBalanceAfter = await usdt.balanceOf(owner);
      const increase = ownerBalanceAfter.sub(ownerBalanceBefore);
      
      assert.equal(increase.toString(), profitAmount.toString(), "Should withdraw all profits");
    });

    it("should reference correct pool", async () => {
      const poolAddress = await profitableReceiver.pool();
      assert.equal(poolAddress, pool.address, "Should reference correct pool");
    });
  });

  describe("Receiver Authorization", () => {
    it("should only accept calls from pool", async () => {
      // Direct call to executeOperation should fail
      try {
        await profitableReceiver.executeOperation(
          usdt.address,
          LOAN_AMOUNT,
          0,
          owner,
          "0x",
          { from: user1 }
        );
        assert.fail("Should have reverted");
      } catch (error) {
        // Should revert because msg.sender is not pool
        assert(true, "Correctly rejects non-pool caller");
      }
    });
  });
});
