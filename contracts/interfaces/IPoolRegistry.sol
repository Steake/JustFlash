// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPoolRegistry
 * @author JustFlash Protocol
 * @notice Interface for the pool registry contract
 * @dev Manages the mapping of tokens to their respective pool addresses
 */
interface IPoolRegistry {
    /**
     * @notice Emitted when a new token is registered
     * @param token The address of the registered token
     * @param pool The address of the pool for the token
     */
    event TokenRegistered(address indexed token, address indexed pool);

    /**
     * @notice Emitted when a token is removed from the registry
     * @param token The address of the removed token
     */
    event TokenRemoved(address indexed token);

    /**
     * @notice Emitted when a token's status is updated
     * @param token The address of the token
     * @param active Whether the token is now active
     */
    event TokenStatusUpdated(address indexed token, bool active);

    /**
     * @notice Registers a new token in the registry
     * @param token The address of the TRC-20 token to register
     * @return success True if registration was successful
     */
    function registerToken(address token) external returns (bool success);

    /**
     * @notice Removes a token from the registry
     * @param token The address of the TRC-20 token to remove
     * @return success True if removal was successful
     */
    function removeToken(address token) external returns (bool success);

    /**
     * @notice Sets the active status of a token
     * @param token The address of the token
     * @param active Whether the token should be active
     */
    function setTokenActive(address token, bool active) external;

    /**
     * @notice Checks if a token is registered and active
     * @param token The address of the token to check
     * @return supported True if the token is supported
     */
    function isTokenSupported(address token) external view returns (bool supported);

    /**
     * @notice Returns all registered tokens
     * @return tokens Array of registered token addresses
     */
    function getRegisteredTokens() external view returns (address[] memory tokens);

    /**
     * @notice Returns the pool address for a token
     * @param token The address of the token
     * @return pool The pool address (address(0) if not registered)
     */
    function getPool(address token) external view returns (address pool);
}
