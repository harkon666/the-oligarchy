// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ILandGenesis is IERC721 {
    /**
     * @notice Returns the vote multiplier percentage for a specific user.
     * @param _user The address of the user to check.
     * @return The voting power multiplier (e.g., 5 for 5%).
     */
    function getMultiplier(address _user) external view returns (uint256);
}
