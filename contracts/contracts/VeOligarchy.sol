// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVeOligarchy.sol";

contract VeOligarchy is ReentrancyGuard, IVeOligarchy {
    using SafeERC20 for IERC20;

    IERC20 public immutable token; // OLIG Token

    // Config GameFi: Max Lock 1 Tahun
    uint256 public constant MAX_LOCK = 365 days;
    uint256 public constant WEEK = 1 weeks;

    struct LockedBalance {
        int128 amount;
        uint256 end;
    }

    mapping(address => LockedBalance) public locked;
    uint256 public totalSupply;

    event Deposit(address indexed provider, uint256 value, uint256 locktime);
    event Withdraw(address indexed provider, uint256 value);

    constructor(address _tokenAddr) {
        token = IERC20(_tokenAddr);
    }

    function createLock(
        uint256 _value,
        uint256 _unlockTime
    ) external override nonReentrant {
        require(_value > 0, "Value > 0");
        require(locked[msg.sender].amount == 0, "Withdraw old first");
        require(_unlockTime > block.timestamp, "Future only");
        require(_unlockTime <= block.timestamp + MAX_LOCK, "Max 1 year");

        uint256 unlockTime = (_unlockTime / WEEK) * WEEK; // Rounding ke minggu

        token.safeTransferFrom(msg.sender, address(this), _value);

        locked[msg.sender] = LockedBalance({
            amount: int128(int256(_value)),
            end: unlockTime
        });

        totalSupply += _value;
        emit Deposit(msg.sender, _value, unlockTime);
    }

    function withdraw() external nonReentrant {
        LockedBalance memory lock = locked[msg.sender];
        require(lock.amount > 0, "No lock");
        require(block.timestamp >= lock.end, "Not expired");

        uint256 amount = uint256(int256(lock.amount));
        delete locked[msg.sender];
        totalSupply -= amount;

        token.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    function balanceOf(address _user) external view override returns (uint256) {
        LockedBalance memory lock = locked[_user];
        if (block.timestamp >= lock.end) return 0;

        uint256 remaining = lock.end - block.timestamp;
        // Voting Power = Amount * SisaWaktu / 1 Tahun
        return (uint256(int256(lock.amount)) * remaining) / MAX_LOCK;
    }
}
