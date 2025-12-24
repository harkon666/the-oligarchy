// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOligarchyVoter.sol";
import "./interfaces/IVeOligarchy.sol";
import "./interfaces/ILandGenesis.sol"; // Added LandGenesis Interface

contract OligarchyVoter is ReentrancyGuard, Ownable, IOligarchyVoter {
    using SafeERC20 for IERC20;

    IERC20 public immutable mETH;
    IVeOligarchy public immutable veOLIG;

    // --- LAND GENESIS INTEGRATION ---
    // Address of the Land NFT contract to check for voting boosts
    ILandGenesis public landGenesis;

    // --- REGION POLITICS INTEGRATION ---
    // Address of politics contract (Governor System)
    address public regionPolitics;

    // Address contract perang (di-set setelah deploy)
    address public warTheater;

    uint256 public CONTRACT_DEPLOYED;
    uint256 public constant EPOCH_DURATION = 1 weeks;
    uint256 public currentEpochStart;
    uint256 public CONTRAT_DEPLOYED;

    struct RegionInfo {
        uint256 totalVotes;
        uint256 bribeAmount;
    }

    // Mapping: Epoch -> RegionID -> Info
    mapping(uint256 => mapping(uint256 => RegionInfo)) public regionData;
    // Mapping: Epoch -> RegionID -> User -> HasVoted
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public hasVotedInRegion;
    // Mapping: Epoch -> User -> VotingPowerUsed
    mapping(uint256 => mapping(address => uint256)) public userUsedPower;
    // Mapping: Epoch -> RegionID -> User -> Weight
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public userVotes;

    event BribeDeposited(
        uint256 indexed epoch,
        uint256 indexed regionId,
        uint256 amount
    );
    event BribeSeized(
        uint256 indexed epoch,
        uint256 fromRegion,
        uint256 toRegion,
        uint256 amount
    );
    event Voted(
        address indexed voter,
        uint256 indexed regionId,
        uint256 weight
    );
    event BribeClaimed(address indexed voter, uint256 amount);

    constructor(address _mETH, address _veOLIG) Ownable(msg.sender) {
        mETH = IERC20(_mETH);
        veOLIG = IVeOligarchy(_veOLIG);
        currentEpochStart = (block.timestamp / EPOCH_DURATION) * EPOCH_DURATION;
        CONTRAT_DEPLOYED = block.timestamp;
    }

    function setWarTheater(address _warTheater) external onlyOwner {
        warTheater = _warTheater;
    }

    /**
     * @notice Set the Land Genesis contract address.
     * @param _landGenesis Address of the LandGenesis contract.
     */
    function setLandGenesis(address _landGenesis) external onlyOwner {
        landGenesis = ILandGenesis(_landGenesis);
    }

    /**
     * @notice Set the Region Politics contract address.
     * @param _politics Address of the RegionPolitics contract.
     */
    function setRegionPolitics(address _politics) external onlyOwner {
        regionPolitics = _politics;
    }

    // Public epoch function - single source of truth for all contracts
    function getCurrentEpoch() public view returns (uint256) {
        return (block.timestamp - CONTRACT_DEPLOYED) / EPOCH_DURATION;
    }

    // --- INTERFACE IMPLEMENTATION ---

    function getRegionWeight(
        uint256 _regionId
    ) external view override returns (uint256) {
        // Use PREVIOUS epoch because syncVotes is called after epoch changes
        // to apply the voting results from the epoch that just finished
        uint256 currentEpoch = getCurrentEpoch();
        if (currentEpoch == 0) return 0;
        return regionData[currentEpoch - 1][_regionId].totalVotes;
    }

    function depositBribe(
        uint256 _regionId,
        uint256 _amount
    ) external override nonReentrant {
        require(_amount > 0, "Zero amount");
        mETH.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 epoch = getCurrentEpoch();
        regionData[epoch][_regionId].bribeAmount += _amount;
        emit BribeDeposited(epoch, _regionId, _amount);
    }

    // Fungsi Khusus untuk Perang (Looting)
    function seizeBribe(
        uint256 _fromRegion,
        uint256 _toRegion,
        uint256 _percent
    ) external override {
        require(msg.sender == warTheater, "Only War Theater");
        uint256 epoch = getCurrentEpoch();

        uint256 victimBribe = regionData[epoch][_fromRegion].bribeAmount;
        if (victimBribe > 0) {
            uint256 loot = (victimBribe * _percent) / 100;
            regionData[epoch][_fromRegion].bribeAmount -= loot;
            regionData[epoch][_toRegion].bribeAmount += loot;
            emit BribeSeized(epoch, _fromRegion, _toRegion, loot);
        }
    }

    // --- VOTING & CLAIM ---

    function vote(uint256 _regionId) external nonReentrant {
        uint256 epoch = getCurrentEpoch();
        uint256 totalPower = veOLIG.balanceOf(msg.sender);

        // --- LAND BOOST LOGIC ---
        // If LandGenesis is set, check if user has a boost
        if (address(landGenesis) != address(0)) {
            uint256 boostPercent = landGenesis.getMultiplier(msg.sender);
            if (boostPercent > 0) {
                // Calculate bonus: (BasePower * Percent) / 100
                uint256 bonusPower = (totalPower * boostPercent) / 100;
                totalPower += bonusPower;
            }
        }

        require(totalPower > 0, "No voting power");
        require(
            !hasVotedInRegion[epoch][_regionId][msg.sender],
            "Already voted here"
        );

        // Use full voting power - fetched fresh to avoid time decay issues
        userUsedPower[epoch][msg.sender] += totalPower;
        regionData[epoch][_regionId].totalVotes += totalPower;

        hasVotedInRegion[epoch][_regionId][msg.sender] = true;
        userVotes[epoch][_regionId][msg.sender] += totalPower;

        emit Voted(msg.sender, _regionId, totalPower);
    }

    function claimBribe(
        uint256 _epoch,
        uint256 _regionId
    ) external nonReentrant {
        require(_epoch < getCurrentEpoch(), "Epoch not finished");
        require(
            hasVotedInRegion[_epoch][_regionId][msg.sender],
            "Did not vote"
        );

        uint256 userWeight = userVotes[_epoch][_regionId][msg.sender];
        require(userWeight > 0, "No weight");

        RegionInfo memory region = regionData[_epoch][_regionId];

        // Rumus: (VoteUser / TotalVoteRegion) * SisaBribeRegion
        uint256 reward = (userWeight * region.bribeAmount) / region.totalVotes;

        userVotes[_epoch][_regionId][msg.sender] = 0; // Reset agar tidak double claim

        if (reward > 0) {
            mETH.safeTransfer(msg.sender, reward);
            emit BribeClaimed(msg.sender, reward);
        }
    }
}
