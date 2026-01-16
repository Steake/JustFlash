const PoolRegistry = artifacts.require("PoolRegistry");
const FlashLoanPool = artifacts.require("FlashLoanPool");
const MockERC20 = artifacts.require("MockERC20");

/**
 * @title PoolRegistry Test Suite
 * @notice Tests for token registration and management
 */
contract("PoolRegistry", (accounts) => {
  const [owner, unauthorized] = accounts;
  
  let registry;
  let pool;
  let usdt;
  let usdc;

  beforeEach(async () => {
    // Deploy pool
    pool = await FlashLoanPool.new(owner, 5);
    
    // Deploy registry
    registry = await PoolRegistry.new(owner, pool.address);
    
    // Deploy mock tokens
    usdt = await MockERC20.new("Test USDT", "USDT", 6);
    usdc = await MockERC20.new("Test USDC", "USDC", 6);
  });

  describe("Deployment", () => {
    it("should deploy with correct owner", async () => {
      const contractOwner = await registry.owner();
      assert.equal(contractOwner, owner, "Owner should be deployer");
    });

    it("should deploy with correct pool address", async () => {
      const poolAddress = await registry.flashLoanPool();
      assert.equal(poolAddress, pool.address, "Pool address should be set");
    });

    it("should have no tokens initially", async () => {
      const count = await registry.getTokenCount();
      assert.equal(count.toNumber(), 0, "Should have no tokens");
    });

    it("should reject deployment with zero pool address", async () => {
      try {
        await PoolRegistry.new(owner, "0x0000000000000000000000000000000000000000");
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });
  });

  describe("Token Registration", () => {
    it("should allow owner to register token", async () => {
      const tx = await registry.registerToken(usdt.address, { from: owner });
      
      assert.equal(tx.logs[0].event, "TokenRegistered", "Should emit TokenRegistered");
      assert.equal(tx.logs[0].args.token, usdt.address, "Token should match");
      assert.equal(tx.logs[0].args.pool, pool.address, "Pool should match");
    });

    it("should mark registered token as supported", async () => {
      await registry.registerToken(usdt.address, { from: owner });
      
      const isSupported = await registry.isTokenSupported(usdt.address);
      assert.equal(isSupported, true, "Token should be supported");
    });

    it("should mark registered token as active", async () => {
      await registry.registerToken(usdt.address, { from: owner });
      
      const isActive = await registry.isTokenActive(usdt.address);
      assert.equal(isActive, true, "Token should be active");
    });

    it("should return pool address for registered token", async () => {
      await registry.registerToken(usdt.address, { from: owner });
      
      const poolAddress = await registry.getPool(usdt.address);
      assert.equal(poolAddress, pool.address, "Should return pool address");
    });

    it("should increment token count", async () => {
      await registry.registerToken(usdt.address, { from: owner });
      await registry.registerToken(usdc.address, { from: owner });
      
      const count = await registry.getTokenCount();
      assert.equal(count.toNumber(), 2, "Should have 2 tokens");
    });

    it("should reject duplicate registration", async () => {
      await registry.registerToken(usdt.address, { from: owner });
      
      try {
        await registry.registerToken(usdt.address, { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("TokenAlreadyRegistered"), "Should revert with TokenAlreadyRegistered");
      }
    });

    it("should reject zero address registration", async () => {
      try {
        await registry.registerToken("0x0000000000000000000000000000000000000000", { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("ZeroAddress"), "Should revert with ZeroAddress");
      }
    });

    it("should reject non-owner registration", async () => {
      try {
        await registry.registerToken(usdt.address, { from: unauthorized });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("OwnableUnauthorizedAccount"), "Should revert with unauthorized");
      }
    });
  });

  describe("Token Removal", () => {
    beforeEach(async () => {
      await registry.registerToken(usdt.address, { from: owner });
    });

    it("should allow owner to remove token", async () => {
      const tx = await registry.removeToken(usdt.address, { from: owner });
      
      assert.equal(tx.logs[0].event, "TokenRemoved", "Should emit TokenRemoved");
      assert.equal(tx.logs[0].args.token, usdt.address, "Token should match");
    });

    it("should mark removed token as not supported", async () => {
      await registry.removeToken(usdt.address, { from: owner });
      
      const isSupported = await registry.isTokenSupported(usdt.address);
      assert.equal(isSupported, false, "Token should not be supported");
    });

    it("should return zero address for removed token", async () => {
      await registry.removeToken(usdt.address, { from: owner });
      
      const poolAddress = await registry.getPool(usdt.address);
      assert.equal(poolAddress, "0x0000000000000000000000000000000000000000", "Should return zero address");
    });

    it("should decrement token count", async () => {
      await registry.registerToken(usdc.address, { from: owner });
      await registry.removeToken(usdt.address, { from: owner });
      
      const count = await registry.getTokenCount();
      assert.equal(count.toNumber(), 1, "Should have 1 token");
    });

    it("should reject removing unregistered token", async () => {
      try {
        await registry.removeToken(usdc.address, { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("TokenNotRegistered"), "Should revert with TokenNotRegistered");
      }
    });

    it("should reject non-owner removal", async () => {
      try {
        await registry.removeToken(usdt.address, { from: unauthorized });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("OwnableUnauthorizedAccount"), "Should revert with unauthorized");
      }
    });
  });

  describe("Token Status", () => {
    beforeEach(async () => {
      await registry.registerToken(usdt.address, { from: owner });
    });

    it("should allow owner to deactivate token", async () => {
      await registry.setTokenActive(usdt.address, false, { from: owner });
      
      const isActive = await registry.isTokenActive(usdt.address);
      assert.equal(isActive, false, "Token should be inactive");
    });

    it("should mark inactive token as not supported", async () => {
      await registry.setTokenActive(usdt.address, false, { from: owner });
      
      const isSupported = await registry.isTokenSupported(usdt.address);
      assert.equal(isSupported, false, "Token should not be supported when inactive");
    });

    it("should allow reactivating token", async () => {
      await registry.setTokenActive(usdt.address, false, { from: owner });
      await registry.setTokenActive(usdt.address, true, { from: owner });
      
      const isSupported = await registry.isTokenSupported(usdt.address);
      assert.equal(isSupported, true, "Token should be supported when reactivated");
    });

    it("should emit TokenStatusUpdated event", async () => {
      const tx = await registry.setTokenActive(usdt.address, false, { from: owner });
      
      assert.equal(tx.logs[0].event, "TokenStatusUpdated", "Should emit TokenStatusUpdated");
      assert.equal(tx.logs[0].args.token, usdt.address, "Token should match");
      assert.equal(tx.logs[0].args.active, false, "Active should be false");
    });

    it("should reject status update for unregistered token", async () => {
      try {
        await registry.setTokenActive(usdc.address, true, { from: owner });
        assert.fail("Should have reverted");
      } catch (error) {
        assert(error.message.includes("TokenNotRegistered"), "Should revert with TokenNotRegistered");
      }
    });
  });

  describe("View Functions", () => {
    beforeEach(async () => {
      await registry.registerToken(usdt.address, { from: owner });
      await registry.registerToken(usdc.address, { from: owner });
    });

    it("should return all registered tokens", async () => {
      const tokens = await registry.getRegisteredTokens();
      
      assert.equal(tokens.length, 2, "Should have 2 tokens");
      assert.equal(tokens[0], usdt.address, "First token should be USDT");
      assert.equal(tokens[1], usdc.address, "Second token should be USDC");
    });

    it("should return correct token count", async () => {
      const count = await registry.getTokenCount();
      assert.equal(count.toNumber(), 2, "Should have 2 tokens");
    });

    it("should check if token is registered", async () => {
      const isRegistered = await registry.isTokenRegistered(usdt.address);
      assert.equal(isRegistered, true, "USDT should be registered");
      
      const newToken = await MockERC20.new("New", "NEW", 18);
      const isNotRegistered = await registry.isTokenRegistered(newToken.address);
      assert.equal(isNotRegistered, false, "New token should not be registered");
    });
  });
});
