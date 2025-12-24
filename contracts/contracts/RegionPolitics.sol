// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./interfaces/IOligarchyVoter.sol";
import "./interfaces/IVeOligarchy.sol";

/**
 * @title RegionPolitics
 * @notice Manages the political life of regions: Elections and Revolutions.
 * @dev Depends on OligarchyVoter for Epoch timing and VeOligarchy for Voting Power.
 */
contract RegionPolitics is Ownable, ReentrancyGuard {
    
    // --- STATE VARIABLES ---
    
    IOligarchyVoter public voter;
    IVeOligarchy public veOLIG;
    ERC20Burnable public oligToken;

    // Config Constants
    uint256 public constant NOMINATION_DEPOSIT = 500 ether; // 500 OLIG to run for Governor
    uint256 public constant REVOLUTION_FEE = 1000 ether;    // 1000 OLIG to start a Revolt (Burned)
    uint256 public constant REVOLUTION_DURATION = 3 days;   // Time window to gather support
    uint256 public constant REVOLUTION_THRESHOLD = 50;      // 50% of Governor's elected votes

    struct Governor {
        address addr;           // The Governor's Address
        uint256 electedEpoch;   // Epoch they were elected in
        uint256 supportPower;   // Total votes they won with
        string guildName;       // Their Guild/Clan Tag
        bool isOusted;          // If true, they were removed by Revolution
    }

    struct Candidate {
        address addr;
        string guildName;
        uint256 totalVotePower;
        bool exists;
    }

    struct Revolution {
        uint256 startTime;
        uint256 totalSupportPower;
        bool active;
        bool executed;
    }

    // RegionID -> Epoch -> Governor
    mapping(uint256 => mapping(uint256 => Governor)) public regionGovernors;

    // RegionID -> Epoch -> Candidate Address -> Candidate Info
    mapping(uint256 => mapping(uint256 => mapping(address => Candidate))) public candidates;
    
    // RegionID -> Epoch -> List of Candidate Addresses (for iteration)
    mapping(uint256 => mapping(uint256 => address[])) public candidateList;

    // RegionID -> Epoch -> Revolution Info
    mapping(uint256 => mapping(uint256 => Revolution)) public revolutions;

    // User Voting Tracking: Region -> Epoch -> User -> Has Voted in Election
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVotedElection;
    
    // User Revolution Tracking: Region -> Epoch -> User -> Has Supported Revolt
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasSupportedRevolt;

    // Contract Revenue (from Nominations)
    uint256 public treasury;

    // --- EVENTS ---
    event Nominated(uint256 indexed regionId, uint256 indexed epoch, address indexed candidate, string guild);
    event ElectionVoted(uint256 indexed regionId, uint256 indexed epoch, address voter, address candidate, uint256 weight);
    event GovernorElected(uint256 indexed regionId, uint256 indexed epoch, address governor, uint256 votes);
    event RevolutionStarted(uint256 indexed regionId, uint256 indexed epoch, address provocateur);
    event RevolutionSupported(uint256 indexed regionId, uint256 indexed epoch, address supporter, uint256 weight);
    event RevolutionExecuted(uint256 indexed regionId, uint256 indexed epoch, bool success, address oustedGovernor);

    constructor(
        address _voter, 
        address _veOlig, 
        address _oligToken
    ) Ownable(msg.sender) {
        voter = IOligarchyVoter(_voter);
        veOLIG = IVeOligarchy(_veOlig);
        oligToken = ERC20Burnable(_oligToken);
    }

    // --- VIEW HELPERS ---
    
    function getCurrentEpoch() public view returns (uint256) {
        return voter.getCurrentEpoch();
    }

    function getGovernor(uint256 _regionId, uint256 _epoch) external view returns (Governor memory) {
        return regionGovernors[_regionId][_epoch];
    }

    function getCurrentGovernor(uint256 _regionId) external view returns (address) {
        // Governor serves in the epoch AFTER they are elected.
        // So for current epoch T, we look at winner from epoch T-1.
        uint256 currentEpoch = getCurrentEpoch();
        if (currentEpoch == 0) return address(0);

        Governor memory gov = regionGovernors[_regionId][currentEpoch - 1];
        
        // "VACUUM OF POWER" Logic:
        // If ousted, return address(0) (Anarchy).
        if (gov.isOusted) return address(0);
        
        return gov.addr;
    }

    // --- ELECTION MECHANICS ---

    /**
     * @notice Run for Governor. Costs a deposit.
     * @param _regionId The region to run for.
     * @param _guildName Your Guild's name (Identity).
     */
    function nominate(uint256 _regionId, string memory _guildName) external nonReentrant {
        uint256 epoch = getCurrentEpoch();
        require(!candidates[_regionId][epoch][msg.sender].exists, "Already nominated");
        
        // Take Deposit
        oligToken.transferFrom(msg.sender, address(this), NOMINATION_DEPOSIT);
        treasury += NOMINATION_DEPOSIT;

        candidates[_regionId][epoch][msg.sender] = Candidate({
            addr: msg.sender,
            guildName: _guildName,
            totalVotePower: 0,
            exists: true
        });

        candidateList[_regionId][epoch].push(msg.sender);
        
        emit Nominated(_regionId, epoch, msg.sender, _guildName);
    }

    /**
     * @notice Vote for a Governor Candidate.
     * @dev Separate from Bribe/Reward voting.
     */
    function vote(uint256 _regionId, address _candidate) external nonReentrant {
        uint256 epoch = getCurrentEpoch();
        require(candidates[_regionId][epoch][_candidate].exists, "Candidate not found");
        require(!hasVotedElection[_regionId][epoch][msg.sender], "Already voted in election");

        uint256 power = veOLIG.balanceOf(msg.sender);
        require(power > 0, "No voting power");

        candidates[_regionId][epoch][_candidate].totalVotePower += power;
        hasVotedElection[_regionId][epoch][msg.sender] = true;

        emit ElectionVoted(_regionId, epoch, msg.sender, _candidate, power);
    }

    /**
     * @notice Finalize election for the PREVIOUS epoch.
     * Can be called by anyone after epoch ends.
     */
    function executeElection(uint256 _regionId, uint256 _epochToFinalize) external nonReentrant {
        uint256 currentEpoch = getCurrentEpoch();
        require(_epochToFinalize < currentEpoch, "Epoch not ended");
        require(regionGovernors[_regionId][_epochToFinalize].addr == address(0), "Election already executed");

        address[] memory cands = candidateList[_regionId][_epochToFinalize];
        require(cands.length > 0, "No candidates");

        address winner = address(0);
        uint256 winningVotes = 0;
        string memory winningGuild = "";

        // Simple Loop to find winner (For MVP, assuming logical candidate count is low ~10-20)
        for (uint256 i = 0; i < cands.length; i++) {
            Candidate memory c = candidates[_regionId][_epochToFinalize][cands[i]];
            if (c.totalVotePower > winningVotes) {
                winningVotes = c.totalVotePower;
                winner = c.addr;
                winningGuild = c.guildName;
            }
        }

        if (winner != address(0)) {
            regionGovernors[_regionId][_epochToFinalize] = Governor({
                addr: winner,
                electedEpoch: _epochToFinalize,
                supportPower: winningVotes,
                guildName: winningGuild,
                isOusted: false
            });
            
            emit GovernorElected(_regionId, _epochToFinalize, winner, winningVotes);
        }
    }

    // --- REVOLUTION MECHANICS (THE COUP) ---

    /**
     * @notice Start a Revolution against the current Governor.
     * @dev Burns OLIG as a "Provocation Fee".
     */
    function startRevolution(uint256 _regionId) external nonReentrant {
        uint256 currentEpoch = getCurrentEpoch();
        
        // Determine who is ruling NOW (Elected in Prev Epoch)
        if (currentEpoch == 0) revert("Game just started");
        uint256 rulingEpoch = currentEpoch - 1;
        
        Governor memory currentGov = regionGovernors[_regionId][rulingEpoch];
        require(currentGov.addr != address(0), "No active Governor");
        require(!currentGov.isOusted, "Already Anarchy");
        require(!revolutions[_regionId][currentEpoch].active, "Revolution already active");

        // BURN Fee
        oligToken.burnFrom(msg.sender, REVOLUTION_FEE);

        // Init Revolution
        revolutions[_regionId][currentEpoch] = Revolution({
            startTime: block.timestamp,
            totalSupportPower: 0,
            active: true,
            executed: false
        });

        // The Provocateur automatically supports
        uint256 power = veOLIG.balanceOf(msg.sender);
        if (power > 0) {
            revolutions[_regionId][currentEpoch].totalSupportPower += power;
            hasSupportedRevolt[_regionId][currentEpoch][msg.sender] = true;
        }

        emit RevolutionStarted(_regionId, currentEpoch, msg.sender);
    }

    /**
     * @notice Join the Coup!
     */
    function supportRevolution(uint256 _regionId) external nonReentrant {
        uint256 epoch = getCurrentEpoch();
        Revolution storage rev = revolutions[_regionId][epoch];
        
        require(rev.active, "No revolution active");
        require(!rev.executed, "Revolution ended");
        require(block.timestamp <= rev.startTime + REVOLUTION_DURATION, "Revolution expired");
        require(!hasSupportedRevolt[_regionId][epoch][msg.sender], "Already supported");

        uint256 power = veOLIG.balanceOf(msg.sender);
        require(power > 0, "No power");

        rev.totalSupportPower += power;
        hasSupportedRevolt[_regionId][epoch][msg.sender] = true;

        emit RevolutionSupported(_regionId, epoch, msg.sender, power);
    }

    /**
     * @notice Execute the Coup if threshold reached.
     */
    function executeRevolution(uint256 _regionId) external nonReentrant {
        uint256 epoch = getCurrentEpoch();
        Revolution storage rev = revolutions[_regionId][epoch];
        require(rev.active, "No revolution");
        require(!rev.executed, "Already executed");

        // Check Target (Governor from Prev Epoch)
        uint256 rulingEpoch = epoch - 1;
        Governor storage gov = regionGovernors[_regionId][rulingEpoch];
        
        require(gov.addr != address(0) && !gov.isOusted, "Target invalid");

        // Check Threshold: Surpass 50% of the votes that elected the Governor
        uint256 threshold = (gov.supportPower * REVOLUTION_THRESHOLD) / 100;
        
        if (rev.totalSupportPower > threshold) {
            // SUCCESS: VACUUM OF POWER
            gov.isOusted = true;
            rev.executed = true;
            emit RevolutionExecuted(_regionId, epoch, true, gov.addr);
        } else {
            // Check if time expired, can mark as failed/closed logic if needed
            // For MVP, execution strictly checks threshold.
            revert("Threshold not reached");
        }
    }
}
