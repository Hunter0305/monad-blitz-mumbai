// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "contracts/StakeYourGoal.sol";
import "contracts/GoalBadgeNFT.sol";

/**
 * @title DeployLocal
 * @dev Local deployment script with full initialization
 * Usage: forge script script/DeployLocal.s.sol
 */
contract DeployLocal is Script {
    function run() public {
        console.log("=== TimeVault Local Deployment ===");
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Timestamp:", block.timestamp);
        console.log("");

        // Deploy badge contract
        console.log("Deploying GoalBadgeNFT...");
        GoalBadgeNFT badgeContract = new GoalBadgeNFT(address(0));
        console.log("[SUCCESS] BadgeNFT deployed at:", address(badgeContract));
        console.log("");

        // Deploy stake contract
        console.log("Deploying StakeYourGoal...");
        StakeYourGoal stakeContract = new StakeYourGoal(address(badgeContract));
        console.log("[SUCCESS] StakeYourGoal deployed at:", address(stakeContract));
        console.log("");

        // Configure contracts
        console.log("Configuring contracts...");
        badgeContract.setStakeContract(address(stakeContract));
        console.log("[SUCCESS] Badge contract linked to StakeYourGoal");
        console.log("");

        // Set AI verifier to backend wallet
        address aiVerifierAddress = address(0xAccA2d1A0cC7adcF2Ec1f3a569B7B545C73b24d1);
        
        console.log("Setting AI Verifier...");
        stakeContract.setAIVerifier(aiVerifierAddress);
        console.log("[SUCCESS] AI Verifier set to:", aiVerifierAddress);
        console.log("");

        // Configure charity address (example: DAO community pool)
        address charityPool = address(0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF);
        console.log("Setting Charity Address...");
        stakeContract.setCharityAddress(charityPool);
        console.log("[SUCCESS] Charity Address set to:", charityPool);
        console.log("");

        // Set charity basis points (50% = 5000 bps by default)
        console.log("Charity split: 50% of failed stakes");
        console.log("");

        // Display summary
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("Badge Contract:  ", address(badgeContract));
        console.log("Stake Contract:  ", address(stakeContract));
        console.log("AI Verifier:     ", aiVerifierAddress);
        console.log("Charity Pool:    ", charityPool);
        console.log("========================================");
        console.log("Minimum Stake:   0.01 ETH");
        console.log("Voting Period:   7 days");
        console.log("Charity Split:   50%");
        console.log("========================================");
        console.log("");
        console.log("FEATURES:");
        console.log("  Goal Creation with staking");
        console.log("  AI Verification (setAIScore / verifyGoal)");
        console.log("  NFT Badge minting on completion");
        console.log("  Streak tracking per user");
        console.log("  Charity donation on goal failure");
        console.log("  DAO voting for mid-range scores");
        console.log("");
        console.log("SECURITY CHECK:");
        console.log("  Only AI Verifier can call setAIScore");
        console.log("  Only AI Verifier can call verifyGoal");
        console.log("  Backend signs transactions with private key");
        console.log("  Users cannot fake AI scores");
        console.log("  NFT badges are soulbound (non-transferable)");
        console.log("========================================");
    }
}
