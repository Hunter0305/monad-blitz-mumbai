// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "contracts/StakeYourGoal.sol";
import "contracts/GoalBadgeNFT.sol";

contract DeployScript is Script {
    function run() external {
        // Get private key from env or use default test account
        uint256 deployerKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerKey = key;
        } catch {
            // Use default Anvil account (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
            deployerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb476cbc1c226f61e91d670ac3c43;
        }

        console.log("Deployer Address:", vm.addr(deployerKey));
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);

        vm.startBroadcast(deployerKey);

        // Deploy badge contract first
        GoalBadgeNFT badgeContract = new GoalBadgeNFT(address(0));
        console.log("[+] GoalBadgeNFT deployed at:", address(badgeContract));

        // Deploy stake contract
        StakeYourGoal stakeContract = new StakeYourGoal(address(badgeContract));
        console.log("[+] StakeYourGoal deployed at:", address(stakeContract));

        // Set stake contract in badge contract
        badgeContract.setStakeContract(address(stakeContract));
        console.log("[+] Badge contract configured");

        vm.stopBroadcast();

        console.log("\n========================================");
        console.log("=== Deployment Summary ===");
        console.log("========================================");
        console.log("Badge Contract:  ", address(badgeContract));
        console.log("Stake Contract:  ", address(stakeContract));
        console.log("Deployer:        ", vm.addr(deployerKey));
        console.log("========================================");
    }
}
