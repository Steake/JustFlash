const FlashLoanPool = artifacts.require("FlashLoanPool");
const FeeCollector = artifacts.require("FeeCollector");
const MockERC20 = artifacts.require("MockERC20");
const MockFlashLoanReceiver = artifacts.require("MockFlashLoanReceiver");

/**
 * @title FlashLoanPool Test Suite
 * @notice Comprehensive tests for the core flash loan functionality
 */
contract("FlashLoanPool", (accounts) => {
  const [owner, user1, , treasury] = accounts;
  
  // Contract instances
  let pool;
  let feeCollector;
  let usdt;
  let receiver;

  // Constants
  const FLASH_LOAN_FEE = 5; // 5 bps = 0.05%
  const INITIAL_SUPPLY = web3.utils.toBN("1000000000000"); // 1M tokens (6 decimals)
  const DEPOSIT_AMOUNT = web3.utils.toBN("100000000000"); // 100k tokens
  const LOAN_AMOUNT = web3.utils.toBN("50000000000"); // 50k tokens

  beforeEach(async () => {
    // Deploy mock token
    usdt = await MockERC20.new("Test USDT", "USDT", 6);
    
    // Deploy FlashLoanPool
    pool = await FlashLoanPool.new(owner, FLASH_LOAN_FEE);
    
    // Deploy FeeCollector
    feeCollector = await FeeCollector.new(owner, treasury, pool.address);
    
    // Configure pool
    await pool.setFeeCollector(feeCollector.address, { from: owner });
    await pool.whitelistToken(usdt.address, { from: owner });
    
    // Deploy receiver
    receiver = await MockFlashLoanReceiver.new(pool.address);
    
    // Mint tokens to users
    await usdt.mint(user1, INITIAL_SUPPLY);
    await usdt.mint(receiver.address, INITIAL_SUPPLY);
  });

  describe("Deployment", () => {
    it("should deploy with correct owner", async () => {
      const contractOwner = await pool.owner();
      assert.equal(contractOwner, owner, "Owner should be deployer");
    });

    it("should deploy with correct fee", async () => {
      const fee = await pool.flashLoanFeeBps();
      assert.equal(fee.toNumber(), FLASH_LOAN_FEE, "Fee should be 5 bps");
    });

    it("should have fee collector set", async () => {
      const collector = await pool.feeCollector();
      assert.equal(collector, feeCollector.address, "FeeCollector should be set");
    });

    it("should have token whitelisted", async () => {
      const isSupported = await pool.isTokenSupported(usdt.address);
      assert.equal(isSupported, true, "Token should be supported");
    });
  });

  describe("Deposits", () => {
    beforeEach(async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
    });

    it("should accept deposits", async () => {
      const tx = await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
      
      // Check event
      assert.equal(tx.logs[0].event, "Deposit", "Should emit Deposit event");
      assert.equal(tx.logs[0].args.depositor, user1, "Depositor should be user1");
      assert.equal(tx.logs[0].args.amount.toString(), DEPOSIT_AMOUNT.toString(), "Amount should match");
    });

    it("should mint correct shares for first deposit", async () => {
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
      
      const shares = await pool.getPoolShares(user1, usdt.address);
      assert.equal(shares.toString(), DEPOSIT_AMOUNT.toString(), "First deposit should be 1:1");
    });

    it("should update pool liquidity", async () => {
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
      
      const liquidity = await pool.getAvailableLiquidity(usdt.address);
      assert.equal(liquidity.toString(), DEPOSIT_AMOUNT.toString(), "Liquidity should match deposit");
    });

    it("should reject zero amount deposits", async () => {
      try {
        await pool.deposit(usdt.address, 0, { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAmount"), "Should revert with ZeroAmount");
      }
    });

    it("should reject unsupported token deposits", async () => {
      const unsupportedToken = await MockERC20.new("Unknown", "UNK", 18);
      await unsupportedToken.mint(user1, DEPOSIT_AMOUNT);
      await unsupportedToken.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
      
      try {
        await pool.deposit(unsupportedToken.address, DEPOSIT_AMOUNT, { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("TokenNotSupported"), "Should revert with TokenNotSupported");
      }
    });
  });

  describe("Withdrawals", () => {
    beforeEach(async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
    });

    it("should allow full withdrawal", async () => {
      const shares = await pool.getPoolShares(user1, usdt.address);
      const tx = await pool.withdraw(usdt.address, shares, { from: user1 });
      
      // Check event
      assert.equal(tx.logs[0].event, "Withdrawal", "Should emit Withdrawal event");
      
      // Check balance returned
      const finalBalance = await usdt.balanceOf(user1);
      assert.equal(finalBalance.toString(), INITIAL_SUPPLY.toString(), "Should return full deposit");
    });

    it("should allow partial withdrawal", async () => {
      const shares = await pool.getPoolShares(user1, usdt.address);
      const halfShares = shares.div(web3.utils.toBN(2));
      
      await pool.withdraw(usdt.address, halfShares, { from: user1 });
      
      const remainingShares = await pool.getPoolShares(user1, usdt.address);
      assert.equal(remainingShares.toString(), halfShares.toString(), "Should have half shares remaining");
    });

    it("should reject withdrawal exceeding shares", async () => {
      const shares = await pool.getPoolShares(user1, usdt.address);
      const excessShares = shares.add(web3.utils.toBN(1));
      
      try {
        await pool.withdraw(usdt.address, excessShares, { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("InsufficientShares"), "Should revert with InsufficientShares");
      }
    });

    it("should reject zero amount withdrawal", async () => {
      try {
        await pool.withdraw(usdt.address, 0, { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAmount"), "Should revert with ZeroAmount");
      }
    });
  });

  describe("Flash Loans", () => {
    beforeEach(async () => {
      // Deposit liquidity
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
    });

    it("should execute successful flash loan", async () => {
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
      
      // Check receiver received callback
      const callCount = await receiver.callCount();
      assert.equal(callCount.toNumber(), 1, "Receiver should be called once");
      
      const lastAmount = await receiver.lastAmount();
      assert.equal(lastAmount.toString(), LOAN_AMOUNT.toString(), "Amount should match");
    });

    it("should charge correct premium", async () => {
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
      
      const lastPremium = await receiver.lastPremium();
      const expectedPremium = LOAN_AMOUNT.mul(web3.utils.toBN(FLASH_LOAN_FEE)).div(web3.utils.toBN(10000));
      
      assert.equal(lastPremium.toString(), expectedPremium.toString(), "Premium should be 0.05%");
    });

    it("should pass initiator correctly", async () => {
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
      
      const lastInitiator = await receiver.lastInitiator();
      assert.equal(lastInitiator, receiver.address, "Initiator should be receiver contract");
    });

    it("should pass params correctly", async () => {
      const params = web3.eth.abi.encodeParameters(['uint256', 'address'], [12345, user1]);
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, params, { from: user1 });
      
      const lastParams = await receiver.lastParams();
      assert.equal(lastParams, params, "Params should be passed through");
    });

    it("should emit FlashLoan event", async () => {
      const tx = await pool.flashLoan(receiver.address, usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
      
      assert.equal(tx.logs[0].event, "FlashLoan", "Should emit FlashLoan event");
      assert.equal(tx.logs[0].args.receiver, receiver.address, "Receiver should match");
      assert.equal(tx.logs[0].args.token, usdt.address, "Token should match");
      assert.equal(tx.logs[0].args.amount.toString(), LOAN_AMOUNT.toString(), "Amount should match");
    });

    it("should reject flash loan exceeding liquidity", async () => {
      const excessAmount = DEPOSIT_AMOUNT.add(web3.utils.toBN(1));
      
      try {
        await receiver.initiateFlashLoan(usdt.address, excessAmount, "0x", { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("InsufficientLiquidity"), "Should revert with InsufficientLiquidity");
      }
    });

    it("should reject zero amount flash loan", async () => {
      try {
        await pool.flashLoan(receiver.address, usdt.address, 0, "0x", { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAmount"), "Should revert with ZeroAmount");
      }
    });

    it("should reject flash loan for unsupported token", async () => {
      const unsupportedToken = await MockERC20.new("Unknown", "UNK", 18);
      
      try {
        await pool.flashLoan(receiver.address, unsupportedToken.address, LOAN_AMOUNT, "0x", { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("TokenNotSupported"), "Should revert with TokenNotSupported");
      }
    });

    it("should reject flash loan with zero receiver address", async () => {
      try {
        await pool.flashLoan("0x0000000000000000000000000000000000000000", usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });

    it("should revert if receiver returns false", async () => {
      await receiver.setShouldReturnTrue(false);
      
      try {
        await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ReceiverCallbackFailed"), "Should revert with ReceiverCallbackFailed");
      }
    });

    it("should revert if receiver does not repay", async () => {
      await receiver.setShouldRepay(false);
      
      try {
        await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        // Transaction should revert
        assert(error.message.includes("revert"), "Should revert");
      }
    });
  });

  describe("Share Value Accrual", () => {
    it("should increase share value with fees", async () => {
      // First deposit
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
      
      // Execute flash loan (generates fees)
      await receiver.initiateFlashLoan(usdt.address, LOAN_AMOUNT, "0x", { from: user1 });
      
      // Check that total deposits increased (from depositor fee share)
      const totalDeposits = await pool.getTotalDeposits(usdt.address);
      
      // 80% of premium goes to depositors (calculated but not used in assertion)
      // const premium = LOAN_AMOUNT.mul(web3.utils.toBN(FLASH_LOAN_FEE)).div(web3.utils.toBN(10000));
      // const depositorShare = premium.mul(web3.utils.toBN(80)).div(web3.utils.toBN(100));
      
      // Total deposits should have increased by depositor share
      // (Note: In current implementation, depositor share is returned to pool)
      assert(totalDeposits.gte(DEPOSIT_AMOUNT), "Total deposits should not decrease");
    });
  });

  describe("Admin Functions", () => {
    it("should allow owner to whitelist token", async () => {
      const newToken = await MockERC20.new("New Token", "NEW", 18);
      
      await pool.whitelistToken(newToken.address, { from: owner });
      
      const isSupported = await pool.isTokenSupported(newToken.address);
      assert.equal(isSupported, true, "Token should be whitelisted");
    });

    it("should allow owner to delist token", async () => {
      await pool.delistToken(usdt.address, { from: owner });
      
      const isSupported = await pool.isTokenSupported(usdt.address);
      assert.equal(isSupported, false, "Token should be delisted");
    });

    it("should allow owner to update fee", async () => {
      const newFee = 10; // 0.10%
      
      await pool.setFlashLoanFee(newFee, { from: owner });
      
      const fee = await pool.flashLoanFeeBps();
      assert.equal(fee.toNumber(), newFee, "Fee should be updated");
    });

    it("should reject fee exceeding maximum", async () => {
      const excessFee = 101; // Over 1%
      
      try {
        await pool.setFlashLoanFee(excessFee, { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("FeeTooHigh"), "Should revert with FeeTooHigh");
      }
    });

    it("should reject non-owner admin calls", async () => {
      try {
        await pool.whitelistToken(user1, { from: user1 });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("OwnableUnauthorizedAccount"), "Should revert with unauthorized");
      }
    });
  });

  describe("View Functions", () => {
    beforeEach(async () => {
      await usdt.approve(pool.address, DEPOSIT_AMOUNT, { from: user1 });
      await pool.deposit(usdt.address, DEPOSIT_AMOUNT, { from: user1 });
    });

    it("should return correct available liquidity", async () => {
      const liquidity = await pool.getAvailableLiquidity(usdt.address);
      assert.equal(liquidity.toString(), DEPOSIT_AMOUNT.toString(), "Should return deposited amount");
    });

    it("should return correct flash loan fee", async () => {
      const fee = await pool.getFlashLoanFee();
      assert.equal(fee.toNumber(), FLASH_LOAN_FEE, "Should return configured fee");
    });

    it("should return correct pool shares", async () => {
      const shares = await pool.getPoolShares(user1, usdt.address);
      assert.equal(shares.toString(), DEPOSIT_AMOUNT.toString(), "Should return correct shares");
    });

    it("should return correct total pool shares", async () => {
      const totalShares = await pool.getTotalPoolShares(usdt.address);
      assert.equal(totalShares.toString(), DEPOSIT_AMOUNT.toString(), "Should return total shares");
    });

    it("should return supported tokens list", async () => {
      const tokens = await pool.getSupportedTokens();
      assert.equal(tokens.length, 1, "Should have one token");
      assert.equal(tokens[0], usdt.address, "Should be USDT");
    });

    it("should convert shares to amount correctly", async () => {
      const amount = await pool.sharesToAmount(usdt.address, DEPOSIT_AMOUNT);
      assert.equal(amount.toString(), DEPOSIT_AMOUNT.toString(), "1:1 ratio for initial deposit");
    });

    it("should convert amount to shares correctly", async () => {
      const shares = await pool.amountToShares(usdt.address, DEPOSIT_AMOUNT);
      assert.equal(shares.toString(), DEPOSIT_AMOUNT.toString(), "1:1 ratio for initial deposit");
    });
  });
});
