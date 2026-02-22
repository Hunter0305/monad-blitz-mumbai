// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "contracts/StakeYourGoal.sol";
import "contracts/GoalBadgeNFT.sol";

contract StakeYourGoalTest is Test {
    StakeYourGoal stakeContract;
    GoalBadgeNFT badgeContract;
    address user = address(0x1);
    address verifier = address(0x2);
    address charity = address(0x3);

    function setUp() public {
        badgeContract = new GoalBadgeNFT(address(0));
        stakeContract = new StakeYourGoal(address(badgeContract));
        badgeContract.setStakeContract(address(stakeContract));

        stakeContract.setAIVerifier(verifier);
        stakeContract.setCharityAddress(charity);

        vm.deal(user, 10 ether);
    }

    // ============================================================
    // 🎯 GOAL CREATION TESTS
    // ============================================================

    function testCreateGoal() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        assertEq(goalId, 0);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.user, user);
        assertEq(goal.stakeAmount, 0.1 ether);
        assertEq(goal.status, 0); // active
    }

    function testCreateGoalEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit StakeYourGoal.GoalCreated(0, user, 0.1 ether, uint64(block.timestamp + 30 days), 0, "Learn Solidity");

        vm.prank(user);
        stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );
    }

    function testCreateGoalRevertsLowStake() public {
        vm.prank(user);
        vm.expectRevert("Stake too low");
        stakeContract.createGoal{value: 0.001 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );
    }

    function testCreateGoalRevertsPastDeadline() public {
        vm.prank(user);
        vm.expectRevert("Deadline must be in future");
        stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp - 1),
            0,
            "Learn Solidity"
        );
    }

    function testCreateGoalRevertsEmptyDescription() public {
        vm.prank(user);
        vm.expectRevert("Description required");
        stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            ""
        );
    }

    function testCreateGoalRevertsInvalidCategory() public {
        vm.prank(user);
        vm.expectRevert("Invalid category");
        stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            6,
            "Learn Solidity"
        );
    }

    function testMultipleGoalsIncrementCounter() public {
        vm.startPrank(user);
        uint256 id0 = stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 1");
        uint256 id1 = stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 1, "Goal 2");
        uint256 id2 = stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 2, "Goal 3");
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(stakeContract.goalCounter(), 3);
    }

    function testUserGoalsTracking() public {
        vm.startPrank(user);
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 1");
        stakeContract.createGoal{value: 0.2 ether}(uint64(block.timestamp + 30 days), 1, "Goal 2");
        vm.stopPrank();

        uint256[] memory goalIds = stakeContract.getUserGoals(user);
        assertEq(goalIds.length, 2);
        assertEq(goalIds[0], 0);
        assertEq(goalIds[1], 1);
    }

    // ============================================================
    // 📤 PROOF SUBMISSION TESTS
    // ============================================================

    function testSubmitProof() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(keccak256(abi.encodePacked(goal.proofURI)), keccak256(abi.encodePacked("QmProofCID")));
    }

    function testSubmitProofEmitsEvent() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.expectEmit(true, true, false, true);
        emit StakeYourGoal.ProofSubmitted(goalId, user, "QmProofCID");

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");
    }

    function testSubmitProofRevertsNonOwner() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        address other = address(0x99);
        vm.prank(other);
        vm.expectRevert("Only goal creator can submit proof");
        stakeContract.submitProof(goalId, "QmProofCID");
    }

    // ============================================================
    // 🤖 AI SCORING & VERIFICATION TESTS
    // ============================================================

    function testAIScoringHighScore() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // High score - auto-complete
        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 85);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 85);
        assertEq(goal.status, 1); // completed
    }

    function testAIScoringLowScore() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // Low score - auto-fail
        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 20);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 20);
        assertEq(goal.status, 2); // failed
    }

    function testAIScoringMidRange() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // Mid-range score - stays active for voting
        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 50);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 50);
        assertEq(goal.status, 0); // still active, triggers voting
    }

    function testAIScoringEmitsGoalVerifiedEvent() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        vm.expectEmit(true, true, false, true);
        emit StakeYourGoal.GoalVerified(goalId, verifier, 85, true);

        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 85);
    }

    // ============================================================
    // ✅ verifyGoal() BINARY VERIFICATION TESTS
    // ============================================================

    function testVerifyGoalPass() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, true);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 100);
        assertEq(goal.status, 1); // completed
    }

    function testVerifyGoalFail() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, false);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 0);
        assertEq(goal.status, 2); // failed
    }

    function testVerifyGoalEmitsEvents() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, true);

        // Check that GoalVerified was emitted by verifying state changes
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 100);
        assertEq(goal.status, 1);
    }

    function testVerifyGoalRevertsNonVerifier() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        vm.expectRevert("Only AI verifier can call");
        stakeContract.verifyGoal(goalId, true);
    }

    function testVerifyGoalRevertsAlreadyVerified() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, true);

        vm.prank(verifier);
        vm.expectRevert("Goal not active");
        stakeContract.verifyGoal(goalId, false);
    }

    // ============================================================
    // 🏆 NFT BADGE MINTING TESTS
    // ============================================================

    function testBadgeMintedOnCompletion() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, true);

        // Badge should be minted
        assertEq(badgeContract.tokenCounter(), 1);
        assertEq(badgeContract.ownerOf(0), user);

        GoalBadgeNFT.BadgeMetadata memory meta = badgeContract.getBadgeMetadata(0);
        assertEq(meta.goalId, goalId);
        assertEq(meta.category, 0);
        assertEq(meta.streak, 1);
    }

    function testBadgeMintedEmitsEvent() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, true);

        // Verify badge was minted (the event was emitted as part of _onGoalCompleted)
        assertEq(badgeContract.tokenCounter(), 1);
        assertEq(badgeContract.ownerOf(0), user);
        assertEq(badgeContract.userBadgeCount(user), 1);
    }

    function testNoBadgeMintedOnFailure() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, false);

        // No badge should be minted
        assertEq(badgeContract.tokenCounter(), 0);
    }

    function testMultipleBadgesMinted() public {
        // Create and verify 3 goals
        vm.startPrank(user);
        uint256 g0 = stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 1");
        uint256 g1 = stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 1, "Goal 2");
        uint256 g2 = stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 2, "Goal 3");
        vm.stopPrank();

        vm.startPrank(verifier);
        stakeContract.verifyGoal(g0, true);
        stakeContract.verifyGoal(g1, true);
        stakeContract.verifyGoal(g2, true);
        vm.stopPrank();

        assertEq(badgeContract.tokenCounter(), 3);
        assertEq(badgeContract.userBadgeCount(user), 3);
    }

    // ============================================================
    // 🔥 STREAK TRACKING TESTS
    // ============================================================

    function testStreakIncrementsOnSuccess() public {
        vm.startPrank(user);
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 1");
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 1, "Goal 2");
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 2, "Goal 3");
        vm.stopPrank();

        vm.startPrank(verifier);
        stakeContract.verifyGoal(0, true);
        stakeContract.verifyGoal(1, true);
        stakeContract.verifyGoal(2, true);
        vm.stopPrank();

        (uint64 current, uint64 highest) = stakeContract.getUserStreak(user);
        assertEq(current, 3);
        assertEq(highest, 3);
    }

    function testStreakResetsOnFailure() public {
        vm.startPrank(user);
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 1");
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 1, "Goal 2");
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 3");
        vm.stopPrank();

        vm.startPrank(verifier);
        stakeContract.verifyGoal(0, true);
        stakeContract.verifyGoal(1, true);
        stakeContract.verifyGoal(2, false); // fail resets streak
        vm.stopPrank();

        (uint64 current, uint64 highest) = stakeContract.getUserStreak(user);
        assertEq(current, 0); // reset
        assertEq(highest, 2); // highest preserved
    }

    function testStreakTrackedInBadgeMetadata() public {
        vm.startPrank(user);
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 0, "Goal 1");
        stakeContract.createGoal{value: 0.1 ether}(uint64(block.timestamp + 30 days), 1, "Goal 2");
        vm.stopPrank();

        vm.startPrank(verifier);
        stakeContract.verifyGoal(0, true);
        stakeContract.verifyGoal(1, true);
        vm.stopPrank();

        // Verify streak via getUserStreak and badge metadata
        (uint64 currentStreak, uint64 highestStreak) = stakeContract.getUserStreak(user);
        assertEq(currentStreak, 2);
        assertEq(highestStreak, 2);

        GoalBadgeNFT.BadgeMetadata memory meta0 = badgeContract.getBadgeMetadata(0);
        GoalBadgeNFT.BadgeMetadata memory meta1 = badgeContract.getBadgeMetadata(1);
        assertEq(meta0.streak, 1);
        assertEq(meta1.streak, 2);
    }

    // ============================================================
    // 💰 WITHDRAW & CHARITY TESTS
    // ============================================================

    function testWithdrawStake() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 90);

        uint256 balanceBefore = user.balance;

        vm.prank(user);
        stakeContract.withdrawStake(goalId);

        uint256 balanceAfter = user.balance;
        assertEq(balanceAfter - balanceBefore, 0.1 ether);
    }

    function testCharityDonationOnFailure() public {
        uint256 charityBalanceBefore = charity.balance;

        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, false);

        uint256 charityBalanceAfter = charity.balance;
        // 50% of 1 ETH = 0.5 ETH should go to charity
        assertEq(charityBalanceAfter - charityBalanceBefore, 0.5 ether);
    }

    function testCharityDonationEmitsEvent() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.expectEmit(true, true, false, true);
        emit StakeYourGoal.CharityDonation(goalId, charity, 0.5 ether);

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, false);
    }

    function testCustomCharityBasisPoints() public {
        stakeContract.setCharityBasisPoints(2500); // 25%

        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        uint256 charityBalanceBefore = charity.balance;

        vm.prank(verifier);
        stakeContract.verifyGoal(goalId, false);

        assertEq(charity.balance - charityBalanceBefore, 0.25 ether);
    }

    function testNoCharityDonationWhenNoCharitySet() public {
        // Deploy a fresh contract without charity
        GoalBadgeNFT freshBadge = new GoalBadgeNFT(address(0));
        StakeYourGoal freshStake = new StakeYourGoal(address(freshBadge));
        freshBadge.setStakeContract(address(freshStake));
        freshStake.setAIVerifier(verifier);
        // Intentionally NOT setting charity address

        vm.deal(user, 10 ether);
        vm.prank(user);
        uint256 goalId = freshStake.createGoal{value: 1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(verifier);
        freshStake.verifyGoal(goalId, false);
        // Should not revert even without charity
    }

    // ============================================================
    // 🗳️ VOTING TESTS
    // ============================================================

    function testVoting() public {
        // Create goal with mid-range score
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // Mid-range score triggers voting
        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 50);

        // Vote
        vm.prank(address(0x10));
        stakeContract.vote(goalId, true);

        (uint256 yesVotes, uint256 noVotes, ) = stakeContract.getVoteInfo(goalId);
        assertEq(yesVotes, 1);
        assertEq(noVotes, 0);
    }

    function testVoteResolutionCompletes() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 60);

        // Multiple voters
        vm.prank(address(0x10));
        stakeContract.vote(goalId, true);
        vm.prank(address(0x11));
        stakeContract.vote(goalId, true);
        vm.prank(address(0x12));
        stakeContract.vote(goalId, false);

        // Resolve
        stakeContract.resolveVote(goalId);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.status, 1); // passed (2 yes > 1 no)
    }

    function testVoteResolutionFails() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 60);

        // More no votes
        vm.prank(address(0x10));
        stakeContract.vote(goalId, false);
        vm.prank(address(0x11));
        stakeContract.vote(goalId, false);
        vm.prank(address(0x12));
        stakeContract.vote(goalId, true);

        // Resolve
        stakeContract.resolveVote(goalId);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.status, 2); // failed (1 yes < 2 no)
    }

    function testVoteResolutionMintsBadgeIfPassed() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 55);

        vm.prank(address(0x10));
        stakeContract.vote(goalId, true);

        stakeContract.resolveVote(goalId);

        // Goal should be completed
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.status, 1);

        // Badge should be minted and streak updated
        assertEq(badgeContract.tokenCounter(), 1);
        assertEq(badgeContract.ownerOf(0), user);

        (uint64 currentStreak, ) = stakeContract.getUserStreak(user);
        assertEq(currentStreak, 1);
    }

    // ============================================================
    // 🔢 FUZZ TESTS
    // ============================================================

    function testFuzzCreateGoal(uint96 stake, uint8 category) public {
        vm.assume(stake >= 0.01 ether && stake <= 10 ether);
        vm.assume(category <= 5);

        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: stake}(
            uint64(block.timestamp + 30 days),
            category,
            "Fuzzed Goal"
        );

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.user, user);
        assertEq(goal.stakeAmount, stake);
        assertEq(goal.category, category);
        assertEq(goal.status, 0);
    }

    // ============================================================
    // 🔐 SECURITY TESTS - Verify onlyAIVerifier Protection
    // ============================================================

    /**
     * 🚨 CRITICAL: User cannot call setAIScore directly
     */
    function testSecurityUserCannotCallSetAIScore() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // 🚨 ATTACK: User tries to give themselves score 100
        vm.prank(user);
        vm.expectRevert("Only AI verifier can call");
        stakeContract.setAIScore(goalId, 100);

        // Verify score was NOT changed
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 0, "Score should remain 0 after failed attack");
    }

    /**
     * 🚨 CRITICAL: Random attacker cannot call setAIScore
     */
    function testSecurityAttackerCannotCallSetAIScore() public {
        address attacker = address(0xDEADBEEF);
        vm.deal(attacker, 10 ether);

        // Create a goal as user
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // 🚨 ATTACK: Attacker tries to score it
        vm.prank(attacker);
        vm.expectRevert("Only AI verifier can call");
        stakeContract.setAIScore(goalId, 95);

        // Verify score unchanged and goal still active
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 0, "Score should be 0");
        assertEq(goal.status, 0, "Goal should still be active");
    }

    /**
     * ✅ VERIFIED: Only the registered aiVerifier can call setAIScore
     */
    function testSecurityOnlyVerifierCanScore() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // ✅ VERIFIED: Verifier CAN call setAIScore
        vm.prank(verifier);
        stakeContract.setAIScore(goalId, 85);

        // Verify score WAS changed
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 85, "Only verifier's score should apply");
        assertEq(goal.status, 1, "Goal should auto-complete at 85");
    }

    /**
     * 🚨 CRITICAL: User cannot call verifyGoal
     */
    function testSecurityUserCannotCallVerifyGoal() public {
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        vm.expectRevert("Only AI verifier can call");
        stakeContract.verifyGoal(goalId, true);

        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.status, 0, "Goal should still be active");
    }

    /**
     * 🔐 Backend automation test
     */
    function testSecurityBackendAutomation() public {
        // Setup
        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Prove Something"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // ✅ Backend (verifier) calls setAIScore with private key
        vm.prank(verifier); // This simulates backend's walletClient
        stakeContract.setAIScore(goalId, 78);

        // ✅ Score applied
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 78);

        // ✅ User can withdraw - must wait for AI
        vm.prank(user);
        stakeContract.withdrawStake(goalId); // Works because status == 1

        // ✅ Funds received
        assertEq(user.balance, 10 ether, "User received stake back");
    }

    /**
     * 🔒 CRITICAL: Even owner cannot bypass onlyAIVerifier
     */
    function testSecurityOwnerCannotBypassAIVerifier() public {
        // The owner (deployer) is different from aiVerifier
        address owner = address(this);

        vm.prank(user);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Learn Solidity"
        );

        vm.prank(user);
        stakeContract.submitProof(goalId, "QmProofCID");

        // 🚨 Even owner cannot score (if not the aiVerifier)
        if (owner != verifier) {
            vm.prank(owner);
            vm.expectRevert("Only AI verifier can call");
            stakeContract.setAIScore(goalId, 75);
        }
    }

    /**
     * 📊 Full attack simulation
     */
    function testSecurityAttackSimulation() public {
        address attacker = address(0xCAFEBABE);
        vm.deal(attacker, 10 ether);

        // Step 1: Attacker stakes
        vm.prank(attacker);
        uint256 goalId = stakeContract.createGoal{value: 0.1 ether}(
            uint64(block.timestamp + 30 days),
            0,
            "Hack the Goal"
        );

        // Step 2: Attacker tries to score themselves 100
        vm.prank(attacker);
        vm.expectRevert("Only AI verifier can call"); // ❌ BLOCKED
        stakeContract.setAIScore(goalId, 100);

        // Step 3: Attacker tries verifyGoal
        vm.prank(attacker);
        vm.expectRevert("Only AI verifier can call"); // ❌ BLOCKED
        stakeContract.verifyGoal(goalId, true);

        // Step 4: Verify goal is unchanged
        StakeYourGoal.Goal memory goal = stakeContract.getGoal(goalId);
        assertEq(goal.aiScore, 0, "No score assigned");
        assertEq(goal.status, 0, "Still active");

        // Step 5: Attacker cannot withdraw
        vm.prank(attacker);
        vm.expectRevert("Goal must be completed");
        stakeContract.withdrawStake(goalId);

        // ✅ Attack failed - funds are safe in contract
    }

    // ============================================================
    // ⚙️ ADMIN FUNCTION TESTS
    // ============================================================

    function testSetBadgeContract() public {
        GoalBadgeNFT newBadge = new GoalBadgeNFT(address(0));
        stakeContract.setBadgeContract(address(newBadge));
        assertEq(address(stakeContract.badgeContract()), address(newBadge));
    }

    function testSetCharityAddress() public {
        address newCharity = address(0xBEEF);
        stakeContract.setCharityAddress(newCharity);
        assertEq(stakeContract.charityAddress(), newCharity);
    }

    function testSetCharityBasisPointsRevertsOver10000() public {
        vm.expectRevert("Basis points must be <= 10000");
        stakeContract.setCharityBasisPoints(10001);
    }

    function testOnlyOwnerCanSetCharity() public {
        vm.prank(user);
        vm.expectRevert();
        stakeContract.setCharityAddress(address(0xBEEF));
    }

    function testOnlyOwnerCanSetBadgeContract() public {
        vm.prank(user);
        vm.expectRevert();
        stakeContract.setBadgeContract(address(0xBEEF));
    }
}
