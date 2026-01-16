// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IPoolRegistry.sol";

/**
 * @title PoolRegistry
 * @author JustFlash Protocol
 * @notice Manages the mapping of tokens to their pool addresses
 * @dev Provides centralized registry for token support and pool discovery.
 * Governance can add/remove tokens after security review.
 */
contract PoolRegistry is IPoolRegistry, Ownable {
    /// @notice Single flash loan pool address
    address public immutable flashLoanPool;

    /// @notice Mapping of token => registration status
    mapping(address => bool) private _registeredTokens;

    /// @notice Mapping of token => active status
    mapping(address => bool) private _activeTokens;

    /// @notice Array of all registered token addresses
    address[] private _tokenList;

    /// @notice Error thrown when address is zero
    error ZeroAddress();

    /// @notice Error thrown when token is already registered
    error TokenAlreadyRegistered(address token);

    /// @notice Error thrown when token is not registered
    error TokenNotRegistered(address token);

    /**
     * @notice Initializes the pool registry
     * @param initialOwner The initial owner address
     * @param poolAddress The flash loan pool address
     */
    constructor(address initialOwner, address poolAddress) Ownable(initialOwner) {
        if (poolAddress == address(0)) revert ZeroAddress();
        flashLoanPool = poolAddress;
    }

    /**
     * @inheritdoc IPoolRegistry
     * @dev Registers a new token and sets it as active by default
     */
    function registerToken(address token) external override onlyOwner returns (bool) {
        if (token == address(0)) revert ZeroAddress();
        if (_registeredTokens[token]) revert TokenAlreadyRegistered(token);

        _registeredTokens[token] = true;
        _activeTokens[token] = true;
        _tokenList.push(token);

        emit TokenRegistered(token, flashLoanPool);

        return true;
    }

    /**
     * @inheritdoc IPoolRegistry
     * @dev Removes token from registry completely
     */
    function removeToken(address token) external override onlyOwner returns (bool) {
        if (!_registeredTokens[token]) revert TokenNotRegistered(token);

        _registeredTokens[token] = false;
        _activeTokens[token] = false;

        // Remove from token list
        for (uint256 i = 0; i < _tokenList.length; i++) {
            if (_tokenList[i] == token) {
                _tokenList[i] = _tokenList[_tokenList.length - 1];
                _tokenList.pop();
                break;
            }
        }

        emit TokenRemoved(token);

        return true;
    }

    /**
     * @inheritdoc IPoolRegistry
     */
    function setTokenActive(address token, bool active) external override onlyOwner {
        if (!_registeredTokens[token]) revert TokenNotRegistered(token);
        
        _activeTokens[token] = active;
        
        emit TokenStatusUpdated(token, active);
    }

    /**
     * @inheritdoc IPoolRegistry
     */
    function isTokenSupported(address token) external view override returns (bool) {
        return _registeredTokens[token] && _activeTokens[token];
    }

    /**
     * @inheritdoc IPoolRegistry
     */
    function getRegisteredTokens() external view override returns (address[] memory) {
        return _tokenList;
    }

    /**
     * @inheritdoc IPoolRegistry
     */
    function getPool(address token) external view override returns (address) {
        if (!_registeredTokens[token]) return address(0);
        return flashLoanPool;
    }

    /**
     * @notice Returns the number of registered tokens
     * @return count The number of tokens in the registry
     */
    function getTokenCount() external view returns (uint256) {
        return _tokenList.length;
    }

    /**
     * @notice Checks if a token is registered (regardless of active status)
     * @param token The token address
     * @return registered True if token is registered
     */
    function isTokenRegistered(address token) external view returns (bool) {
        return _registeredTokens[token];
    }

    /**
     * @notice Returns active status for a token
     * @param token The token address
     * @return active True if token is active
     */
    function isTokenActive(address token) external view returns (bool) {
        return _activeTokens[token];
    }
}
