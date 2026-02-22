import "dotenv/config";
import {
  initializeClients,
  watchProofSubmitted,
  watchGoalCreated,
  watchGoalVerified,
  getGoal,
  submitAIScore,
} from "./chain";
import { scoreProof } from "./groq";
import { fetchProofFromIPFS, parseProofContent } from "./ipfs";

// Track processed goals to avoid duplicate processing
const processedGoals = new Set<bigint>();
const processingGoals = new Set<bigint>();

async function processProofSubmission(goalId: bigint, proofURI: string) {
  // Prevent duplicate processing
  if (processedGoals.has(goalId) || processingGoals.has(goalId)) {
    console.log(`⏭️  Goal #${goalId.toString()} already processed, skipping`);
    return;
  }

  processingGoals.add(goalId);

  try {
    const { publicClient, walletClient, contractAddress, account } =
      initializeClients();

    console.log(`\n🔍 Processing proof for goal #${goalId.toString()}`);
    console.log(`📎 Proof URI: ${proofURI}`);
    console.log(`🔗 Verifier: ${account.address}`);

    // Step 1: Fetch goal details from contract
    console.log("📥 Fetching goal details from contract...");
    const goalData = await getGoal(publicClient, contractAddress, goalId);
    const goal = goalData as any;

    const description = goal.description || "No description";
    console.log(`📝 Goal: ${description}`);

    // Step 2: Fetch proof content from IPFS
    console.log("🌐 Fetching proof from IPFS...");
    const proofContent = await fetchProofFromIPFS(proofURI);
    const parsedProof = parseProofContent(proofContent);
    console.log(`✅ Proof content fetched (${parsedProof.length} characters)`);

    // Step 3: Score with Groq + Llama 3.3
    console.log("🤖 Scoring proof with Llama 3.3 70B...");
    const { score, reason } = await scoreProof(description, parsedProof);
    console.log(`📊 AI Score: ${score}/100`);
    console.log(`💬 Reason: ${reason}`);

    // Step 4: Determine outcome
    if (score >= 75) {
      console.log("🏆 Auto-completing goal (score >= 75)");
      console.log("🎖️  NFT badge will be minted automatically");
    } else if (score < 40) {
      console.log("❌ Auto-failing goal (score < 40)");
      console.log("💸 Charity donation will be triggered");
    } else {
      console.log("🗳️  Mid-range score — triggering DAO vote");
    }

    // Step 5: Submit score on-chain
    console.log("⛓️  Submitting score on-chain...");
    const hash = await submitAIScore(
      walletClient,
      contractAddress,
      goalId,
      score
    );
    console.log(`✅ Transaction submitted: ${hash}`);

    // Mark as processed
    processedGoals.add(goalId);
    console.log(
      `✨ Goal #${goalId.toString()} processing complete!\n`
    );
  } catch (error) {
    console.error(
      `❌ Failed to process goal #${goalId.toString()}:`,
      error
    );
    // Don't mark as processed on error, allow retry
  } finally {
    processingGoals.delete(goalId);
  }
}

async function startVerifier() {
  console.log("\n🚀 TimeVault AI Verifier starting...");
  console.log("=======================================");

  try {
    const { publicClient, contractAddress } = initializeClients();

    console.log(`✅ Connected to Monad Testnet`);
    console.log(`📋 Contract: ${contractAddress}`);
    console.log(`🤖 Model: Llama 3.3 70B (via Groq)`);
    console.log("=======================================\n");

    // Watch for GoalCreated events (log new goals)
    const unwatchCreated = watchGoalCreated(publicClient, contractAddress, async (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        if (args.goalId !== undefined) {
          console.log(`📢 New goal created: #${args.goalId.toString()}`);
          console.log(`   User: ${args.user}`);
          console.log(`   Stake: ${args.stakeAmount?.toString()} wei`);
          console.log(`   Description: ${args.description || "N/A"}\n`);
        }
      }
    });
    console.log("👂 Listening for GoalCreated events...");

    // Watch for ProofSubmitted events (trigger AI verification)
    const unwatchProof = watchProofSubmitted(publicClient, contractAddress, async (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        if (args.goalId && args.proofURI) {
          await processProofSubmission(args.goalId, args.proofURI);
        }
      }
    });
    console.log("👂 Listening for ProofSubmitted events...");

    // Watch for GoalVerified events (log verification results)
    const unwatchVerified = watchGoalVerified(publicClient, contractAddress, async (logs) => {
      for (const log of logs) {
        const args = log.args as any;
        if (args.goalId !== undefined) {
          console.log(
            `${args.passed ? "✅" : "❌"} Goal #${args.goalId.toString()} verified: ${args.passed ? "PASSED" : "FAILED"} (score: ${args.score?.toString()})`
          );
        }
      }
    });
    console.log("👂 Listening for GoalVerified events...\n");

    // Keep process alive
    process.on("SIGINT", () => {
      console.log("\n\n🛑 Shutting down gracefully...");
      unwatchCreated();
      unwatchProof();
      unwatchVerified();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Verifier startup failed:", error);
    process.exit(1);
  }
}

// Start the verifier
startVerifier().catch((error) => {
  console.error("🔥 Fatal error:", error);
  process.exit(1);
});
