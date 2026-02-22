// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakeYourGoalSecure
 * @dev Advanced version with signature verification for AI oracle
 * 
 * Benefits:
 * - Backend signs AI verdict off-chain
 * - Contract verifies signature on-chain
 * - No need to trust RPC endpoint
 * - Can pause oracle without emergency withdraw
 */
contract StakeYourGoalSecure is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Goal {
        address user;
        uint96 stakeAmount;
        uint64 deadline;
        uint64 createdAt;
        uint64 aiScore;
        uint8 status; // 0=active, 1=completed, 2=failed, 3=disputed
        uint8 category;
        string description;
        string proofURI;
    }

    // Nonce to prevent replay attacks
    mapping(uint256 => uint256) public goalNonces;
    mapping(uint256 => Goal) public goals;
    mapping(address => uint256[]) public userGoals;

    address public aiSigner; // Backend address that signs verdicts
    uint256 public goalCounter;

    event GoalCreated(
        uint256 indexed goalId,
        address indexed user,
        uint256 stakeAmount
    );

    event AIVerdictSubmitted(
        uint256 indexed goalId,
        uint64 score,
        bytes signature
    );

    constructor(address _aiSigner) Ownable(msg.sender) {
        aiSigner = _aiSigner;
    }

    /**
     * ✅ Advanced: Backend signs verdict off-chain
     * 
     * Backend does:
     * const messageHash = ethers.utils.solidityKeccak256(
     *   ['uint256', 'uint64', 'uint256'],
     *   [goalId, score, nonce]
     * );
     * const signature = await backend.signMessage(ethers.utils.arrayify(messageHash));
     */
    function submitAIVerdictWithSignature(
        uint256 goalId,
        uint64 score,
        bytes memory signature
    ) external nonReentrant {
        require(score <= 100, "Invalid score");
        require(goals[goalId].status == 0, "Goal not active");

        // Create message hash
        uint256 nonce = goalNonces[goalId];
        bytes32 messageHash = keccak256(
            abi.encodePacked(goalId, score, nonce)
        );

        // Verify signature came from aiSigner
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == aiSigner, "Invalid AI signature");

        // Increment nonce to prevent replay
        goalNonces[goalId]++;

        // Update goal
        goals[goalId].aiScore = score;

        // Auto-resolve
        if (score >= 75) {
            goals[goalId].status = 1;
        } else if (score < 40) {
            goals[goalId].status = 2;
        }

        emit AIVerdictSubmitted(goalId, score, signature);
    }

    /**
     * Emergency: Owner can update AI signer (if compromised)
     */
    function updateAISigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid address");
        aiSigner = newSigner;
    }

    /**
     * Create a goal
     */
    function createGoal(
        string memory description
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= 0.01 ether, "Stake too low");
        require(bytes(description).length > 0, "Description required");

        uint256 goalId = goalCounter++;
        Goal storage goal = goals[goalId];

        goal.user = msg.sender;
        goal.stakeAmount = uint96(msg.value);
        goal.createdAt = uint64(block.timestamp);
        goal.status = 0;
        goal.description = description;

        userGoals[msg.sender].push(goalId);

        emit GoalCreated(goalId, msg.sender, msg.value);
        return goalId;
    }
}
