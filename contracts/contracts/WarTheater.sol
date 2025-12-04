// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IOligarchyVoter.sol";

contract WarTheater is Ownable, ReentrancyGuard {
    ERC20Burnable public immutable oligToken;
    IOligarchyVoter public voter;

    uint256 public constant LOOT_PERCENTAGE = 30; // 30% Loot
    uint256 public constant EPOCH_DURATION = 1 weeks;

    // Mapping: Epoch -> RegionID -> Power
    mapping(uint256 => mapping(uint256 => uint256)) public regionAttackPower;
    mapping(uint256 => mapping(uint256 => uint256)) public regionDefensePower;

    // Mapping: Epoch -> Attacker -> Defender
    mapping(uint256 => mapping(uint256 => uint256)) public warTargets;
    mapping(uint256 => mapping(uint256 => bool)) public warResolved;

    event WarDeclared(uint256 epoch, uint256 attacker, uint256 defender);
    event TroopsEnlisted(
        address user,
        uint256 regionId,
        uint256 amount,
        bool isAttack
    );
    event WarResult(
        uint256 epoch,
        uint256 attacker,
        uint256 defender,
        bool success
    );

    constructor(address _oligToken, address _voter) Ownable(msg.sender) {
        oligToken = ERC20Burnable(_oligToken);
        voter = IOligarchyVoter(_voter);
    }

    function _getCurrentEpoch() internal view returns (uint256) {
        return (block.timestamp / EPOCH_DURATION) * EPOCH_DURATION;
    }

    function declareWar(
        uint256 _attackerRegion,
        uint256 _defenderRegion
    ) external {
        uint256 epoch = _getCurrentEpoch();
        require(_attackerRegion != _defenderRegion, "Self attack");
        require(warTargets[epoch][_attackerRegion] == 0, "Already warring");

        warTargets[epoch][_attackerRegion] = _defenderRegion;
        emit WarDeclared(epoch, _attackerRegion, _defenderRegion);
    }

    function enlistTroops(
        uint256 _regionId,
        uint256 _amount,
        bool _isAttack
    ) external nonReentrant {
        require(_amount > 0, "Need troops");
        // DEFLATION: Burn OLIG user
        oligToken.burnFrom(msg.sender, _amount);

        uint256 epoch = _getCurrentEpoch();

        if (_isAttack) {
            require(warTargets[epoch][_regionId] != 0, "No war target");
            regionAttackPower[epoch][_regionId] += _amount;
        } else {
            regionDefensePower[epoch][_regionId] += _amount;
        }

        emit TroopsEnlisted(msg.sender, _regionId, _amount, _isAttack);
    }

    function resolveWar(uint256 _attackerRegion) external nonReentrant {
        uint256 epoch = _getCurrentEpoch();
        uint256 defenderRegion = warTargets[epoch][_attackerRegion];

        require(defenderRegion != 0, "No war");
        require(!warResolved[epoch][_attackerRegion], "Resolved");

        uint256 att = regionAttackPower[epoch][_attackerRegion];
        uint256 def = regionDefensePower[epoch][defenderRegion];

        bool attackerWon = att > def;

        if (attackerWon) {
            // Panggil Voter untuk pindahkan Bribe mETH
            voter.seizeBribe(defenderRegion, _attackerRegion, LOOT_PERCENTAGE);
        }

        warResolved[epoch][_attackerRegion] = true;
        emit WarResult(epoch, _attackerRegion, defenderRegion, attackerWon);
    }
}
