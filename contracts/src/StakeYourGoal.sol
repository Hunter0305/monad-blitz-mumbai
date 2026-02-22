// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice Interface for GoalBadgeNFT minting from verified goals
interface IGoalBadgeNFT {
    function mintBadge(
        address user,
        uint256 goalId,
        uint8 category,
        uint64 streak
    ) external returns (uint256);
}

/**
 * @title StakeYourGoal
 * @dev Main contract for goal staking, verification, and community voting
 */
contract StakeYourGoal is Ownable, ReentrancyGuard {
    
    // Goal struct with packed storage
    struct Goal {
        address user;
        uint96 stakeAmount;
        uint64 deadline;
        uint64 createdAt;
        uint64 aiScore;
        uint8 status;         // 0=active, 1=completed, 2=failed, 3=disputed
        uint8 category;       // 0=health, 1=work, 2=learning, 3=fitness, 4=finance, 5=other
        string description;
        string proofURI;      // IPFS CID
    }

    // Goal storage
    uint256 public goalCounter;
    mapping(uint256 => Goal) public goals;
    mapping(address => uint256[]) public userGoals;

    // Voting struct
    struct Vote {
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
        bool resolved;
        bool passed;
    }
    mapping(uint256 => Vote) public votes;

    // Badge contract reference
    IERC721 public badgeContract;
    IGoalBadgeNFT public badgeMinter;

    // State variables
    uint256 public minimumStake = 0.01 ether;
    uint256 public votingPeriod = 7 days;
    address public aiVerifier;
    uint256 public totalStaked;

    // Charity / fund routing
    address public charityAddress;
    uint256 public charityBasisPoints = 5000; // 50% of failed stakes go to charity

    // Streak tracking per user
    mapping(address => uint64) public userStreaks;
    mapping(address => uint64) public userHighestStreak;

    // Events
    event GoalCreated(
        uint256 indexed goalId,
        address indexed user,
        uint256 stakeAmount,
        uint64 deadline,
        uint8 category,
        string description
    );

    event ProofSubmitted(
        uint256 indexed goalId,
        address indexed user,
        string proofURI
    );

    event AIScoredProof(
        uint256 indexed goalId,
        uint64 score,
        string reason
    );

    event VoteStarted(uint256 indexed goalId, uint256 votingDeadline);
    event VoteCast(uint256 indexed goalId, address indexed voter, bool support);
    event VoteResolved(uint256 indexed goalId, bool passed, uint256 yesVotes, uint256 noVotes);
    event GoalResolved(uint256 indexed goalId, uint8 status);
    event StakeWithdrawn(address indexed user, uint256 amount);

    event GoalVerified(
        uint256 indexed goalId,
        address indexed verifier,
        uint64 score,
        bool passed
    );

    event BadgeMintedForGoal(
        uint256 indexed goalId,
        address indexed user,
        uint256 tokenId
    );

    event CharityDonation(
        uint256 indexed goalId,
        address indexed charity,
        uint256 amount
    );

    // Modifiers
    modifier onlyAIVerifier() {
        require(msg.sender == aiVerifier, "Only AI verifier can call");
        _;
    }

    modifier goalExists(uint256 goalId) {
        require(goalId < goalCounter, "Goal does not exist");
        _;
    }

    constructor(address _badgeContract) Ownable(msg.sender) {
        badgeContract = IERC721(_badgeContract);
        badgeMinter = IGoalBadgeNFT(_badgeContract);
        aiVerifier = msg.sender;
    }

    /**
     * @dev Create a new goal with staking
     */
    function createGoal(
        uint64 deadline,
        uint8 category,
        string memory description
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= minimumStake, "Stake too low");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bytes(description).length > 0, "Description required");
        require(category <= 5, "Invalid category");

        uint256 goalId = goalCounter++;
        Goal storage goal = goals[goalId];

        goal.user = msg.sender;
        goal.stakeAmount = uint96(msg.value);
        goal.deadline = deadline;
        goal.createdAt = uint64(block.timestamp);
        goal.status = 0; // active
        goal.category = category;
        goal.description = description;

        userGoals[msg.sender].push(goalId);
        totalStaked += msg.value;

        emit GoalCreated(goalId, msg.sender, msg.value, deadline, category, description);
        return goalId;
    }

    /**
     * @dev Submit proof of goal completion (triggers AI verification)
     */
    function submitProof(uint256 goalId, string memory proofURI) 
        external 
        goalExists(goalId) 
        nonReentrant 
    {
        Goal storage goal = goals[goalId];
        require(goal.user == msg.sender, "Only goal creator can submit proof");
        require(goal.status == 0, "Goal not active");
        require(block.timestamp <= goal.deadline + 1 days, "Proof submission window closed");

        goal.proofURI = proofURI;
        emit ProofSubmitted(goalId, msg.sender, proofURI);
    }

    /**
     * @dev AI verifier scores the proof (0-100)
     */
    function setAIScore(uint256 goalId, uint64 score) 
        external 
        goalExists(goalId) 
        onlyAIVerifier 
    {
        require(score <= 100, "Score must be 0-100");
        Goal storage goal = goals[goalId];
        require(goal.status == 0, "Goal not active");

        goal.aiScore = score;

        bool passed = score >= 75;

        // Auto-resolve high confidence scores
        if (passed) {
            goal.status = 1; // completed
            _onGoalCompleted(goalId, goal);
            emit GoalResolved(goalId, 1);
        } else if (score < 40) {
            goal.status = 2; // failed
            _onGoalFailed(goalId, goal);
            emit GoalResolved(goalId, 2);
        } else {
            // Mid-range: trigger DAO vote
            emit VoteStarted(goalId, block.timestamp + votingPeriod);
        }

        emit AIScoredProof(goalId, score, "AI verification complete");
        emit GoalVerified(goalId, msg.sender, score, passed);
    }

    /**
     * @dev Convenience function: verify goal with binary pass/fail (called by AI verifier)
     * Equivalent to setAIScore with 100 (pass) or 0 (fail)
     */
    function verifyGoal(uint256 goalId, bool result)
        external
        goalExists(goalId)
        onlyAIVerifier
    {
        Goal storage goal = goals[goalId];
        require(goal.status == 0, "Goal not active");

        uint64 score = result ? 100 : 0;
        goal.aiScore = score;

        if (result) {
            goal.status = 1; // completed
            _onGoalCompleted(goalId, goal);
            emit GoalResolved(goalId, 1);
        } else {
            goal.status = 2; // failed
            _onGoalFailed(goalId, goal);
            emit GoalResolved(goalId, 2);
        }

        emit AIScoredProof(goalId, score, result ? "Goal verified by AI" : "Goal rejected by AI");
        emit GoalVerified(goalId, msg.sender, score, result);
    }

    /**
     * @dev Cast vote on disputed goal (40-74 score range)
     */
    function vote(uint256 goalId, bool support) 
        external 
        goalExists(goalId) 
        nonReentrant 
    {
        Goal storage goal = goals[goalId];
        require(goal.status == 0, "Goal not in voting phase");
        require(goal.aiScore >= 40 && goal.aiScore < 75, "Not eligible for voting");

        Vote storage v = votes[goalId];
        require(!v.hasVoted[msg.sender], "Already voted");

        v.hasVoted[msg.sender] = true;

        if (support) {
            v.yesVotes++;
        } else {
            v.noVotes++;
        }

        emit VoteCast(goalId, msg.sender, support);
    }

    /**
     * @dev Resolve voting and finalize goal status
     */
    function resolveVote(uint256 goalId) 
        external 
        goalExists(goalId) 
        nonReentrant 
    {
        Goal storage goal = goals[goalId];
        Vote storage v = votes[goalId];
        
        require(!v.resolved, "Vote already resolved");
        require(goal.status == 0, "Goal not active");

        bool passed = v.yesVotes > v.noVotes;
        v.resolved = true;
        v.passed = passed;

        if (passed) {
            goal.status = 1;
            _onGoalCompleted(goalId, goal);
        } else {
            goal.status = 2;
            _onGoalFailed(goalId, goal);
        }

        emit VoteResolved(goalId, passed, v.yesVotes, v.noVotes);
        emit GoalResolved(goalId, goal.status);
    }

    /**
     * @dev Withdraw stake (only if goal completed successfully)
     */
    function withdrawStake(uint256 goalId) 
        external 
        goalExists(goalId) 
        nonReentrant 
    {
        Goal storage goal = goals[goalId];
        require(goal.user == msg.sender, "Only goal creator");
        require(goal.status == 1, "Goal must be completed"); // status 1 = completed

        uint256 amount = goal.stakeAmount;
        goal.stakeAmount = 0;
        totalStaked -= amount;

        (bool success, ) = payable(msg.sender).call{ value: amount }("");
        require(success, "Withdrawal failed");

        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Get goal details
     */
    function getGoal(uint256 goalId) 
        external 
        view 
        goalExists(goalId) 
        returns (Goal memory) 
    {
        return goals[goalId];
    }

    /**
     * @dev Get user goals
     */
    function getUserGoals(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userGoals[user];
    }

    /**
     * @dev Get voting info
     */
    function getVoteInfo(uint256 goalId) 
        external 
        view 
        goalExists(goalId) 
        returns (uint256 yesVotes, uint256 noVotes, bool resolved) 
    {
        Vote storage v = votes[goalId];
        return (v.yesVotes, v.noVotes, v.resolved);
    }

    /**
     * @dev Admin: set AI verifier address
     */
    function setAIVerifier(address _verifier) external onlyOwner {
        aiVerifier = _verifier;
    }

    /**
     * @dev Admin: set minimum stake
     */
    function setMinimumStake(uint256 _minStake) external onlyOwner {
        minimumStake = _minStake;
    }

    /**
     * @dev Admin: set voting period
     */
    function setVotingPeriod(uint256 _period) external onlyOwner {
        votingPeriod = _period;
    }

    /**
     * @dev Admin: set charity address for failed stakes
     */
    function setCharityAddress(address _charity) external onlyOwner {
        charityAddress = _charity;
    }

    /**
     * @dev Admin: set charity basis points (out of 10000)
     */
    function setCharityBasisPoints(uint256 _bps) external onlyOwner {
        require(_bps <= 10000, "Basis points must be <= 10000");
        charityBasisPoints = _bps;
    }

    /**
     * @dev Admin: set badge contract address
     */
    function setBadgeContract(address _badgeContract) external onlyOwner {
        badgeContract = IERC721(_badgeContract);
        badgeMinter = IGoalBadgeNFT(_badgeContract);
    }

    // ============================================================
    // Internal Helpers
    // ============================================================

    /**
     * @dev Called when a goal is completed (AI score >= 75 or vote passed)
     * Increments user streak and mints an NFT badge
     */
    function _onGoalCompleted(uint256 goalId, Goal storage goal) internal {
        // Update streak
        userStreaks[goal.user]++;
        uint64 currentStreak = userStreaks[goal.user];
        if (currentStreak > userHighestStreak[goal.user]) {
            userHighestStreak[goal.user] = currentStreak;
        }

        // Mint NFT badge if badge contract is set
        if (address(badgeMinter) != address(0)) {
            try badgeMinter.mintBadge(
                goal.user,
                goalId,
                goal.category,
                currentStreak
            ) returns (uint256 tokenId) {
                emit BadgeMintedForGoal(goalId, goal.user, tokenId);
            } catch {
                // Badge minting failure should not revert goal completion
            }
        }
    }

    /**
     * @dev Called when a goal fails (AI score < 40 or vote failed)
     * Resets user streak and routes stake to charity if configured
     */
    function _onGoalFailed(uint256 goalId, Goal storage goal) internal {
        // Reset streak on failure
        userStreaks[goal.user] = 0;

        // Route portion of stake to charity
        if (charityAddress != address(0) && goal.stakeAmount > 0) {
            uint256 charityAmount = (uint256(goal.stakeAmount) * charityBasisPoints) / 10000;
            if (charityAmount > 0) {
                (bool sent, ) = payable(charityAddress).call{value: charityAmount}("");
                if (sent) {
                    emit CharityDonation(goalId, charityAddress, charityAmount);
                }
            }
        }
    }

    /**
     * @dev Get user streak info
     */
    function getUserStreak(address user)
        external
        view
        returns (uint64 currentStreak, uint64 highestStreak)
    {
        return (userStreaks[user], userHighestStreak[user]);
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
