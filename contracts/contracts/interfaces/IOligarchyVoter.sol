// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOligarchyVoter {
    function getRegionWeight(uint256 _regionId) external view returns (uint256);

    function depositBribe(uint256 _regionId, uint256 _amount) external;

    function seizeBribe(
        uint256 _fromRegion,
        uint256 _toRegion,
        uint256 _percent
    ) external;
}
