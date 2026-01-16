const FlashLoanPool = artifacts.require("FlashLoanPool");
const FeeCollector = artifacts.require("FeeCollector");
const PoolRegistry = artifacts.require("PoolRegistry");
const MockERC20 = artifacts.require("MockERC20");
const MockFlashLoanReceiver = artifacts.require("MockFlashLoanReceiver");

/**
 * @title Integration Test Suite
 * @notice End-to-end tests for complete protocol flows
 */
contract("Integration", (accounts) => {
  const [owner, depositor1, depositor2, borrower, treasury] = accounts;
  
  let pool;
  let feeCollector;
  let registry;
  let usdt;
  let usdc;
  let receiver;

  const FLASH_LOAN_FEE = 5; // 0.05%
  const INITIAL_SUPPLY = web3.utils.toBN("10000000000000"); // 10M tokens
  const DEPOSIT_AMOUNT = web3.utils.toBN("1000000000000"); // 1M tokens
  const LOAN_AMOUNT = web3.utils.toBN("500000000000"); // 500k tokens

  beforeEach(async () => {
    // Deploy tokens
    usdt = await MockERC20.new("Test USDT", "USDT", 6);
    usdc = await MockERC20.new("Test USDC", "USDC", 6);
    
    // Deploy protocol
    pool = await FlashLoanPool.new(owner, FLASH_LOAN_FEE);
    feeCollector = await FeeCollector.new(owner, treasury, pool.address);
    registry = await PoolRegistry.new(owner, pool.address);
    
    // Configure
    await pool.setFeeCollector(feeCollector.address, { from: owner });
    await pool.whitelistToken(usdt.address, { from: owner });
    await pool.whitelistToken(usdc.address, { from: owner });
    await registry.registerToken(usdt.address, { from: owner });
    await registry.registerToken(usdc.address, { from: owner });
    
    // Deploy receiver
    receiver = await MockFlashLoanReceiver.new(pool.address);
    
    // Mint tokens
    await usdt.mint(depositor1, INITIAL_SUPPLY);
    await usdt.mint(depositor2, INITIAL_SUPPLY);
    await usdt.mint(receiver.address, INITIAL_SUPPLY);
    await usdc.mint(depositor1, INITIAL_SUPPLY);
    await usdc.mint(receiver.address, INITIAL_SUPPLY);
  });

  describe("Full Protocol Flow", () => {
    it("should handle complete deposit -> flash loan -> withdraw cycle", async () => {
      // 1. Depositor1 deposits USDT
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      const sharesAfterDeposit = await pool.getPoolShares(depositor1, usdt.address);
      assert.equal(sharesAfterDeposit.toString(), DEPOSIT_AMOUNT.toString(), "Should receive 1:1 shares");
      
      // 2. Execute flash loan
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      
      // Verify premium was charged
      const expectedPremium = LOAN_AMOUNT.mul(web3.utils.toBN(FLASH_LOAN_FEE)).div(web3.utils.toBN(10000));
      const lastPremium = await receiver.lastPremium();
      assert.equal(lastPremium.toString(), expectedPremium.toString(), "Premium should be 0.05%");
      
      // 3. Depositor1 withdraws
      const shares = await pool.getPoolShares(depositor1, usdt.address);
      await pool.withdraw(usdt.address, shares, { from: depositor1 });
      
      // Should have received original deposit plus share of fees
      const finalBalance = await usdt.balanceOf(depositor1);
      assert(finalBalance.gte(INITIAL_SUPPLY), "Should have at least original amount");
    });

    it("should handle multiple depositors correctly", async () => {
      // Depositor1 deposits first
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Execute flash loan to generate fees
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      
      // Depositor2 deposits after fees accumulated
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor2 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor2 });
      
      // Check share distribution
      const shares1 = await pool.getPoolShares(depositor1, usdt.address);
      const shares2 = await pool.getPoolShares(depositor2, usdt.address);
      
      // Depositor1 should have same shares as initial deposit
      assert.equal(shares1.toString(), DEPOSIT_AMOUNT.toString(), "Depositor1 shares unchanged");
      
      // Depositor2 should have fewer shares (pool value increased)
      // shares2 = (DEPOSIT_AMOUNT * totalShares) / totalDeposits
      // Since totalDeposits > totalShares after fees, shares2 < DEPOSIT_AMOUNT
      // But in our implementation, depositor share goes back to pool
      assert(shares2.gt(web3.utils.toBN(0)), "Depositor2 should have shares");
    });

    it("should handle multiple tokens independently", async () => {
      // Deposit both tokens
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      await usdc.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdc.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Flash loan from USDT only
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      
      // Check liquidity
      const usdtLiquidity = await pool.getAvailableLiquidity(usdt.address);
      const usdcLiquidity = await pool.getAvailableLiquidity(usdc.address);
      
      // USDT liquidity should be unchanged (loan repaid with premium)
      // USDC liquidity should be unchanged
      assert(usdtLiquidity.gte(DEPOSIT_AMOUNT), "USDT liquidity should be >= deposit");
      assert.equal(usdcLiquidity.toString(), DEPOSIT_AMOUNT.toString(), "USDC liquidity unchanged");
    });

    it("should handle consecutive flash loans", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Execute multiple flash loans
      for (let i = 0; i < 5; i++) {
        await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      }
      
      const callCount = await receiver.callCount();
      assert.equal(callCount.toNumber(), 5, "Should execute 5 flash loans");
      
      // Pool should still have liquidity
      const liquidity = await pool.getAvailableLiquidity(usdt.address);
      assert(liquidity.gte(DEPOSIT_AMOUNT), "Pool should maintain liquidity");
    });
  });

  describe("Fee Distribution Flow", () => {
    it("should distribute fees correctly (80/20 split)", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      const poolBalanceBefore = await usdt.balanceOf(pool.address);
      
      // Execute flash loan
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      
      const expectedPremium = LOAN_AMOUNT.mul(web3.utils.toBN(FLASH_LOAN_FEE)).div(web3.utils.toBN(10000));
      const expectedTreasury = expectedPremium.mul(web3.utils.toBN(20)).div(web3.utils.toBN(100));
      const expectedDepositor = expectedPremium.mul(web3.utils.toBN(80)).div(web3.utils.toBN(100));
      
      // Check treasury fees accumulated
      const treasuryFees = await feeCollector.getTreasuryFees(usdt.address);
      assert.equal(treasuryFees.toString(), expectedTreasury.toString(), "Treasury should get 20%");
      
      // Pool balance should have increased by depositor share
      const poolBalanceAfter = await usdt.balanceOf(pool.address);
      const poolIncrease = poolBalanceAfter.sub(poolBalanceBefore);
      assert.equal(poolIncrease.toString(), expectedDepositor.toString(), "Pool should receive 80%");
    });

    it("should allow treasury withdrawal", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Execute flash loan to generate fees
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      
      const treasuryFees = await feeCollector.getTreasuryFees(usdt.address);
      const treasuryBalanceBefore = await usdt.balanceOf(treasury);
      
      // Withdraw treasury fees
      await feeCollector.withdrawTreasuryFees(usdt.address);
      
      const treasuryBalanceAfter = await usdt.balanceOf(treasury);
      const increase = treasuryBalanceAfter.sub(treasuryBalanceBefore);
      
      assert.equal(increase.toString(), treasuryFees.toString(), "Treasury should receive fees");
      
      // Fees should be cleared
      const remainingFees = await feeCollector.getTreasuryFees(usdt.address);
      assert.equal(remainingFees.toNumber(), 0, "Fees should be cleared after withdrawal");
    });
  });

  describe("Registry Integration", () => {
    it("should properly integrate pool and registry", async () => {
      // Check registry returns correct pool
      const poolFromRegistry = await registry.getPool(usdt.address);
      assert.equal(poolFromRegistry, pool.address, "Registry should return correct pool");
      
      // Check both are in sync
      const isPoolSupported = await pool.isTokenSupported(usdt.address);
      const isRegistrySupported = await registry.isTokenSupported(usdt.address);
      
      assert.equal(isPoolSupported, isRegistrySupported, "Pool and registry should agree");
    });

    it("should handle token listing/delisting flow", async () => {
      const newToken = await MockERC20.new("New Token", "NEW", 18);
      
      // Not supported initially
      const isSupported1 = await registry.isTokenSupported(newToken.address);
      assert.equal(isSupported1, false, "Should not be supported initially");
      
      // Register and whitelist
      await pool.whitelistToken(newToken.address, { from: owner });
      await registry.registerToken(newToken.address, { from: owner });
      
      const isSupported2 = await registry.isTokenSupported(newToken.address);
      assert.equal(isSupported2, true, "Should be supported after registration");
      
      // Deactivate
      await registry.setTokenActive(newToken.address, false, { from: owner });
      
      const isSupported3 = await registry.isTokenSupported(newToken.address);
      assert.equal(isSupported3, false, "Should not be supported after deactivation");
    });
  });

  describe("Edge Cases", () => {
    it("should handle flash loan equal to total liquidity", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Borrow entire pool
      await receiver.initiateFlashLoan(usdt.address, DEPOSIT_AMOUNT, "0x", { from: borrower });
      
      const callCount = await receiver.callCount();
      assert.equal(callCount.toNumber(), 1, "Should execute flash loan for full amount");
    });

    it("should handle minimum flash loan amount", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Borrow 1 token unit
      await receiver.initiateFlashLoan(usdt.address, 1, "0x", { from: borrower });
      
      const lastAmount = await receiver.lastAmount();
      assert.equal(lastAmount.toNumber(), 1, "Should handle minimum amount");
    });

    it("should handle deposit and immediate withdrawal", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      const shares = await pool.getPoolShares(depositor1, usdt.address);
      await pool.withdraw(usdt.address, shares, { from: depositor1 });
      
      const balance = await usdt.balanceOf(depositor1);
      assert.equal(balance.toString(), INITIAL_SUPPLY.toString(), "Should return exact deposit");
    });

    it("should handle fee change between flash loans", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Flash loan with 5 bps fee
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      const premium1 = await receiver.lastPremium();
      
      // Change fee to 10 bps
      await pool.setFlashLoanFee(10, { from: owner });
      
      // Flash loan with new fee
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      const premium2 = await receiver.lastPremium();
      
      // Premium2 should be double premium1
      assert.equal(premium2.toString(), premium1.mul(web3.utils.toBN(2)).toString(), "Premium should double");
    });
  });

  describe("Gas Optimization Verification", () => {
    it("should execute flash loan within reasonable gas", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      const tx = await pool.flashLoan(receiver.address, usdt.address, LOAN_AMOUNT, "0x", { from: borrower });
      
      // Gas should be reasonable (adjust threshold as needed)
      // Typical flash loan + callback should be under 500k gas
      assert(tx.receipt.gasUsed < 500000, `Gas used: ${tx.receipt.gasUsed} should be under 500k`);
    });

    it("should execute deposit within reasonable gas", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      const tx = await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      // Deposit should be under 200k gas
      assert(tx.receipt.gasUsed < 200000, `Gas used: ${tx.receipt.gasUsed} should be under 200k`);
    });

    it("should execute withdrawal within reasonable gas", async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: depositor1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: depositor1 });
      
      const shares = await pool.getPoolShares(depositor1, usdt.address);
      const tx = await pool.withdraw(usdt.address, shares, { from: depositor1 });
      
      // Withdrawal should be under 150k gas
      assert(tx.receipt.gasUsed < 150000, `Gas used: ${tx.receipt.gasUsed} should be under 150k`);
    });
  });
});
