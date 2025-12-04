// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IOligarchyVoter.sol";

interface IMintableToken is IERC20 {
    function mint(address to, uint256 amount) external;
}

contract RegionFarmDynamic is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IMintableToken public immutable oligToken;
    IERC20 public immutable mETH;
    IOligarchyVoter public voter;

    uint256 public constant EXIT_TAX_RATE = 1; // 0.01%
    uint256 public constant DENOMINATOR = 10000;

    // Dynamic Emission: Berapa OLIG per mETH per detik
    uint256 public baseEmissionRate;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        uint256 allocPoint; // Bobot Voting (Multiplier)
        uint256 lastRewardTime;
        uint256 accOligPerShare;
        uint256 totalStaked; // Total Principal User
    }

    mapping(uint256 => PoolInfo) public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    uint256 public totalAllocPoint = 0;
    uint256[] public activeRegions;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        uint256 tax
    );

    constructor(
        address _oligToken,
        address _mETH,
        address _voter,
        uint256 _baseEmissionRate
    ) Ownable(msg.sender) {
        oligToken = IMintableToken(_oligToken);
        mETH = IERC20(_mETH);
        voter = IOligarchyVoter(_voter);
        baseEmissionRate = _baseEmissionRate;
    }

    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTime) return;

        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 duration = block.timestamp - pool.lastRewardTime;

        // --- DYNAMIC EMISSION LOGIC ---
        // Reward = TVL * Durasi * BaseRate * (PoolVote / TotalVote)
        uint256 voteMultiplier = 1e12; // Default 1x
        if (totalAllocPoint > 0) {
            voteMultiplier = (pool.allocPoint * 1e12) / totalAllocPoint;
        }

        // Kalkulasi Emisi OLIG
        uint256 oligReward = (pool.totalStaked *
            duration *
            baseEmissionRate *
            voteMultiplier) / (1e12 * 1e12);

        if (oligReward > 0) {
            oligToken.mint(address(this), oligReward);
            pool.accOligPerShare += (oligReward * 1e12) / pool.totalStaked;
        }

        pool.lastRewardTime = block.timestamp;
    }

    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);

        if (user.amount > 0) {
            uint256 pending = ((user.amount * pool.accOligPerShare) / 1e12) -
                user.rewardDebt;
            if (pending > 0) safeOligTransfer(msg.sender, pending);
        }

        if (_amount > 0) {
            mETH.safeTransferFrom(msg.sender, address(this), _amount);
            user.amount += _amount;
            pool.totalStaked += _amount;
        }
        user.rewardDebt = (user.amount * pool.accOligPerShare) / 1e12;
        emit Deposit(msg.sender, _pid, _amount);
    }

    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "Over withdraw");
        updatePool(_pid);

        uint256 pending = ((user.amount * pool.accOligPerShare) / 1e12) -
            user.rewardDebt;
        if (pending > 0) safeOligTransfer(msg.sender, pending);

        if (_amount > 0) {
            user.amount -= _amount;
            pool.totalStaked -= _amount;

            // EXIT TAX -> Bribe Pool
            uint256 tax = (_amount * EXIT_TAX_RATE) / DENOMINATOR;
            uint256 net = _amount - tax;

            mETH.safeTransfer(msg.sender, net);
            if (tax > 0) {
                // Approval manual tidak diperlukan karena mETH ada di contract ini
                // Langsung approve ke Voter sebelum deposit
                mETH.approve(address(voter), tax);
                voter.depositBribe(_pid, tax);
            }
            emit Withdraw(msg.sender, _pid, net, tax);
        }
        user.rewardDebt = (user.amount * pool.accOligPerShare) / 1e12;
    }

    function syncVotes() external {
        uint256 newTotal = 0;
        for (uint256 i = 0; i < activeRegions.length; i++) {
            uint256 pid = activeRegions[i];
            updatePool(pid); // Harvest dulu sebelum bobot berubah
            uint256 weight = voter.getRegionWeight(pid);
            poolInfo[pid].allocPoint = weight;
            newTotal += weight;
        }
        totalAllocPoint = newTotal;
    }

    function addRegion(
        uint256 _regionId,
        uint256 _initialAllocPoint
    ) external onlyOwner {
        activeRegions.push(_regionId);
        poolInfo[_regionId].allocPoint = _initialAllocPoint;
        totalAllocPoint += _initialAllocPoint;
    }

    function safeOligTransfer(address _to, uint256 _amount) internal {
        uint256 oligBal = oligToken.balanceOf(address(this));
        if (_amount > oligBal) oligToken.transfer(_to, oligBal);
        else oligToken.transfer(_to, _amount);
    }
}
