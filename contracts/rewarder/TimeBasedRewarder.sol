// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IRewarder.sol";
import "../token/OfficialMasterChef.sol";

contract TimeBasedRewarder is IRewarder, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        uint256 accRewardTokenPerShare;
        uint256 lastRewardTime;
        uint256 allocPoint;
    }

    /// @notice Info of each pool.
    mapping(uint256 => PoolInfo) public poolInfo;

    uint256[] public masterchefPoolIds;

    /// @notice Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 totalAllocPoint;

    uint256 public rewardPerSecond;
    uint256 private constant ACC_TOKEN_PRECISION = 1e12;

    address private immutable MASTERCHEF;

    event LogOnReward(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        address indexed to
    );
    event LogPoolAddition(uint256 indexed pid, uint256 allocPoint);
    event LogSetPool(uint256 indexed pid, uint256 allocPoint);
    event LogUpdatePool(
        uint256 indexed pid,
        uint256 lastRewardTime,
        uint256 lpSupply,
        uint256 accRewardTokenPerShare
    );
    event LogRewardPerSecond(uint256 rewardPerSecond);
    event LogInit();

    constructor(
        IERC20 _rewardToken,
        uint256 _rewardPerSecond,
        address _MASTERCHEF
    ) {
        rewardToken = _rewardToken;
        rewardPerSecond = _rewardPerSecond;
        MASTERCHEF = _MASTERCHEF;
    }

    function onBeetsReward(
        uint256 pid,
        address userAddress,
        address recipient,
        uint256,
        uint256 newLpAmount
    ) external override onlyMasterChef {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage userPoolInfo = userInfo[pid][userAddress];
        uint256 pending;
        if (userPoolInfo.amount > 0) {
            pending =
                ((userPoolInfo.amount * pool.accRewardTokenPerShare) /
                    ACC_TOKEN_PRECISION) -
                userPoolInfo.rewardDebt;
            if (pending > rewardToken.balanceOf(address(this))) {
                pending = rewardToken.balanceOf(address(this));
            }
        }
        userPoolInfo.amount = newLpAmount;
        userPoolInfo.rewardDebt =
            (newLpAmount * pool.accRewardTokenPerShare) /
            ACC_TOKEN_PRECISION;

        if (pending > 0) {
            rewardToken.safeTransfer(recipient, pending);
        }

        emit LogOnReward(userAddress, pid, pending, recipient);
    }

    function pendingTokens(
        uint256 pid,
        address user,
        uint256
    )
        external
        view
        override
        returns (IERC20[] memory rewardTokens, uint256[] memory rewardAmounts)
    {
        IERC20[] memory _rewardTokens = new IERC20[](1);
        _rewardTokens[0] = (rewardToken);
        uint256[] memory _rewardAmounts = new uint256[](1);
        _rewardAmounts[0] = pendingToken(pid, user);
        return (_rewardTokens, _rewardAmounts);
    }

    /// @notice Sets the rewards per second to be distributed. Can only be called by the owner.
    /// @param _rewardPerSecond The amount of token rewards to be distributed per second.
    function setRewardPerSecond(uint256 _rewardPerSecond) public onlyOwner {
        rewardPerSecond = _rewardPerSecond;
        emit LogRewardPerSecond(_rewardPerSecond);
    }

    modifier onlyMasterChef() {
        require(
            msg.sender == MASTERCHEF,
            "Only MasterChef can call this function."
        );
        _;
    }

    /// @notice Returns the number of rewarded pools.
    function poolLength() public view returns (uint256 pools) {
        pools = masterchefPoolIds.length;
    }

    /// @notice Add a new LP to the pool. Can only be called by the owner.
    /// @param allocPoint AP of the new pool.
    /// @param pid Pid on MasterChef
    function add(uint256 pid, uint256 allocPoint) public onlyOwner {
        require(poolInfo[pid].lastRewardTime == 0, "Pool already exists");
        uint256 lastRewardTime = block.timestamp;
        totalAllocPoint = totalAllocPoint + allocPoint;

        poolInfo[pid] = PoolInfo({
            allocPoint: allocPoint,
            lastRewardTime: lastRewardTime,
            accRewardTokenPerShare: 0
        });
        masterchefPoolIds.push(pid);
        emit LogPoolAddition(pid, allocPoint);
    }

    /// @notice Update the given pool's reward token allocation point and `IRewarder` contract. Can only be called by the owner.
    /// @param pid The index of the MasterChef pool. See `poolInfo`.
    /// @param allocPoint New AP of the pool.
    function set(uint256 pid, uint256 allocPoint) public onlyOwner {
        require(poolInfo[pid].lastRewardTime != 0, "Pool does not exist");
        totalAllocPoint =
            totalAllocPoint -
            poolInfo[pid].allocPoint +
            allocPoint;

        poolInfo[pid].allocPoint = allocPoint;
        emit LogSetPool(pid, allocPoint);
    }

    /// @notice View function to see pending Token
    /// @param _pid The index of the MasterChef pool. See `poolInfo`.
    /// @param _user Address of user.
    /// @return pending rewards for a given user.
    function pendingToken(uint256 _pid, address _user)
        public
        view
        returns (uint256 pending)
    {
        PoolInfo memory pool = poolInfo[_pid];
        if (pool.lastRewardTime == 0) {
            pending = 0;
        } else {
            UserInfo storage user = userInfo[_pid][_user];
            uint256 accRewardTokenPerShare = pool.accRewardTokenPerShare;

            uint256 totalLpSupply = OfficialMasterChef(MASTERCHEF)
                .lpTokens(_pid)
                .balanceOf(MASTERCHEF);

            if (block.timestamp > pool.lastRewardTime && totalLpSupply != 0) {
                uint256 timeSinceLastReward = block.timestamp -
                    pool.lastRewardTime;

                uint256 rewards = (timeSinceLastReward *
                    rewardPerSecond *
                    pool.allocPoint) / totalAllocPoint;

                accRewardTokenPerShare =
                    accRewardTokenPerShare +
                    ((rewards * ACC_TOKEN_PRECISION) / totalLpSupply);
            }
            pending =
                ((user.amount * accRewardTokenPerShare) / ACC_TOKEN_PRECISION) -
                user.rewardDebt;
            if (pending > rewardToken.balanceOf(address(this))) {
                pending = rewardToken.balanceOf(address(this));
            }
        }
    }

    /// @notice Update reward variables for all pools. Be careful of gas spending!
    /// @param pids Pool IDs of all to be updated. Make sure to update all active pools.
    function massUpdatePools(uint256[] calldata pids) external {
        uint256 len = pids.length;
        for (uint256 i = 0; i < len; ++i) {
            updatePool(pids[i]);
        }
    }

    /// @notice Update reward variables of the given pool.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @return pool Returns the pool that was updated.
    function updatePool(uint256 pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[pid];
        if (pool.lastRewardTime != 0 && block.timestamp > pool.lastRewardTime) {
            uint256 totalLpSupply = OfficialMasterChef(MASTERCHEF)
                .lpTokens(pid)
                .balanceOf(MASTERCHEF);

            if (totalLpSupply > 0) {
                uint256 time = block.timestamp - pool.lastRewardTime;
                uint256 tokenReward = (time *
                    rewardPerSecond *
                    pool.allocPoint) / totalAllocPoint;
                pool.accRewardTokenPerShare =
                    pool.accRewardTokenPerShare +
                    ((tokenReward * ACC_TOKEN_PRECISION) / totalLpSupply);
            }
            pool.lastRewardTime = block.timestamp;
            poolInfo[pid] = pool;
            emit LogUpdatePool(
                pid,
                pool.lastRewardTime,
                totalLpSupply,
                pool.accRewardTokenPerShare
            );
        }
    }
}
