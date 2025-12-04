// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVeOligarchy {
    function balanceOf(address account) external view returns (uint256);

    function createLock(uint256 _value, uint256 _unlockTime) external;
}
