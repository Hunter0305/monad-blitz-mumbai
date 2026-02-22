// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "contracts/StakeYourGoal.sol";
import "contracts/GoalBadgeNFT.sol";

/**
 * @title AiVerifierSetup
 * @dev Setup script to configure AI verifier after deployment
 * Usage: forge script script/SetAIVerifier.s.sol --rpc-url <RPC>
 */
contract AiVerifierSetup is Script {
    function run() external {
        // Read from environment or use known backend address
        string memory backendAddressEnv = vm.envString("BACKEND_ADDRESS");
        address backendAddress = vm.parseAddress(backendAddressEnv);

        address payable stakeContractAddress = payable(vm.envAddress("CONTRACT_ADDRESS"));

        console.log("========================================");
        console.log("Setting AI Verifier");
        console.log("========================================");
        console.log("Backend Address: ", backendAddress);
        console.log("Stake Contract:  ", stakeContractAddress);
        console.log("");

        vm.startBroadcast();

        // Load contract and set verifier
        StakeYourGoal stakeContract = StakeYourGoal(stakeContractAddress);
        stakeContract.setAIVerifier(backendAddress);

        vm.stopBroadcast();

        console.log("[SUCCESS] AI Verifier set to backend address");
        console.log("");
        console.log("Now only backend can call setAIScore()");
        console.log("[OK] Security: Users cannot fake AI scores");
        console.log("[OK] Automation: Backend auto-verifies proofs");
        console.log("========================================");
    }
}
