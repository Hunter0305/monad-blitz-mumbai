import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Extended WalletClient type that includes writeContract.
 * The base WalletClient type from viem doesn't expose writeContract
 * unless the account generic is specified.
 */
type WriteableWalletClient = WalletClient<Transport, Chain, Account>;

// Monad Testnet configuration
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || "https://testnet-rpc.monad.xyz"],
    },
  },
} as const;

// Contract ABI — includes all events and functions for goal lifecycle
export const STAKE_CONTRACT_ABI = [
  // ============================================================
  // Events
  // ============================================================
  {
    type: "event",
    name: "GoalCreated",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "stakeAmount", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint64" },
      { indexed: false, name: "category", type: "uint8" },
      { indexed: false, name: "description", type: "string" },
    ],
  },
  {
    type: "event",
    name: "ProofSubmitted",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "proofURI", type: "string" },
    ],
  },
  {
    type: "event",
    name: "GoalVerified",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: true, name: "verifier", type: "address" },
      { indexed: false, name: "score", type: "uint64" },
      { indexed: false, name: "passed", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "AIScoredProof",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: false, name: "score", type: "uint64" },
      { indexed: false, name: "reason", type: "string" },
    ],
  },
  {
    type: "event",
    name: "GoalResolved",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: false, name: "status", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "BadgeMintedForGoal",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "CharityDonation",
    inputs: [
      { indexed: true, name: "goalId", type: "uint256" },
      { indexed: true, name: "charity", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "StakeWithdrawn",
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  // ============================================================
  // Read Functions
  // ============================================================
  {
    type: "function",
    name: "getGoal",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [
      {
        name: "goal",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "stakeAmount", type: "uint96" },
          { name: "deadline", type: "uint64" },
          { name: "createdAt", type: "uint64" },
          { name: "aiScore", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "category", type: "uint8" },
          { name: "description", type: "string" },
          { name: "proofURI", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserGoals",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "goalIds", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserStreak",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "currentStreak", type: "uint64" },
      { name: "highestStreak", type: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "goalCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalStaked",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // ============================================================
  // Write Functions
  // ============================================================
  {
    type: "function",
    name: "setAIScore",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "score", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyGoal",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "result", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createGoal",
    inputs: [
      { name: "deadline", type: "uint64" },
      { name: "category", type: "uint8" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "goalId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "submitProof",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "proofURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawStake",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Initialize viem clients
export function initializeClients() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable not set");
  }

  const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable not set");
  }

  const account = privateKeyToAccount(
    privateKey.startsWith("0x")
      ? (privateKey as `0x${string}`)
      : (`0x${privateKey}` as `0x${string}`)
  );

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  return {
    publicClient,
    walletClient,
    contractAddress,
    account,
  };
}

/**
 * Fetch goal details from contract
 */
export async function getGoal(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  goalId: bigint
) {
  return publicClient.readContract({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    functionName: "getGoal",
    args: [goalId],
  });
}

/**
 * Submit AI score on-chain (0-100 range with auto-resolve)
 */
export async function submitAIScore(
  walletClient: WriteableWalletClient,
  contractAddress: `0x${string}`,
  goalId: bigint,
  score: number
) {
  if (score < 0 || score > 100) {
    throw new Error("Score must be between 0 and 100");
  }

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    functionName: "setAIScore",
    args: [goalId, BigInt(score)],
  });

  return hash;
}

/**
 * Binary verify goal on-chain (pass/fail)
 */
export async function verifyGoal(
  walletClient: WriteableWalletClient,
  contractAddress: `0x${string}`,
  goalId: bigint,
  result: boolean
) {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    functionName: "verifyGoal",
    args: [goalId, result],
  });

  return hash;
}

/**
 * Watch for ProofSubmitted events
 */
export function watchProofSubmitted(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  onLogs: (logs: any[]) => Promise<void>
) {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    eventName: "ProofSubmitted",
    onLogs,
  });
}

/**
 * Watch for GoalCreated events
 */
export function watchGoalCreated(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  onLogs: (logs: any[]) => Promise<void>
) {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    eventName: "GoalCreated",
    onLogs,
  });
}

/**
 * Watch for GoalVerified events
 */
export function watchGoalVerified(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  onLogs: (logs: any[]) => Promise<void>
) {
  return publicClient.watchContractEvent({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    eventName: "GoalVerified",
    onLogs,
  });
}

/**
 * Get total goals count
 */
export async function getGoalCounter(
  publicClient: PublicClient,
  contractAddress: `0x${string}`
) {
  return publicClient.readContract({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    functionName: "goalCounter",
  });
}

/**
 * Get total staked amount
 */
export async function getTotalStaked(
  publicClient: PublicClient,
  contractAddress: `0x${string}`
) {
  return publicClient.readContract({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    functionName: "totalStaked",
  });
}

/**
 * Get user streak info
 */
export async function getUserStreak(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  user: `0x${string}`
) {
  return publicClient.readContract({
    address: contractAddress,
    abi: STAKE_CONTRACT_ABI,
    functionName: "getUserStreak",
    args: [user],
  });
}
