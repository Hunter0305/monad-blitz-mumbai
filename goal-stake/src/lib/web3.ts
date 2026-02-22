// Web3 utilities using viem for Monad Testnet integration
import { createWalletClient, custom, parseEther, formatEther, createPublicClient, http } from "viem";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type TransactionState = 'idle' | 'waiting_signature' | 'pending' | 'confirmed' | 'failed';

export interface WalletState {
  connected: boolean;
  address: `0x${string}` | null;
  network: string;
  balance: string;
}

export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL || "https://testnet-rpc.monad.xyz"] } },
} as const;

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || "0xb230808C9163995b21B0CE417D75171b0aE60b68") as `0x${string}`;

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
  {
    type: "function",
    name: "getUserGoals",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "goalIds", type: "uint256[]" }],
    stateMutability: "view",
  },
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
  {
    type: "function",
    name: "getVoteInfo",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [
      { name: "yesVotes", type: "uint256" },
      { name: "noVotes", type: "uint256" },
      { name: "resolved", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

let walletAddress: `0x${string}` | null = null;

type SimplePublicClient = {
  getBalance: (args: { address: `0x${string}` }) => Promise<bigint>;
  readContract: (args: {
    address: `0x${string}`;
    abi: typeof STAKE_CONTRACT_ABI;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
  getLogs: (args: {
    address: `0x${string}`;
    event: unknown;
    fromBlock: bigint;
    toBlock: "latest";
  }) => Promise<unknown[]>;
  watchContractEvent: (args: {
    address: `0x${string}`;
    abi: typeof STAKE_CONTRACT_ABI;
    eventName: string;
    onLogs: (logs: unknown[]) => void;
  }) => () => void;
};

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0]),
}) as unknown as SimplePublicClient;
const walletClient =
  typeof window !== "undefined" && (window as Window & typeof globalThis & { ethereum?: EthereumProvider }).ethereum
    ? createWalletClient({
      chain: monadTestnet,
      transport: custom(
        (window as Window & typeof globalThis & { ethereum?: EthereumProvider }).ethereum as EthereumProvider,
      ),
    })
    : null;

export async function connectWallet(): Promise<WalletState> {
  const ethereum = (window as Window & typeof globalThis & { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) throw new Error("No wallet found. Please install MetaMask.");

  // Request accounts
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  walletAddress = accounts[0] as `0x${string}`;

  // Ensure Monad Testnet is added/switch network
  const chainIdHex = "0x279F";
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: "Monad Testnet",
            nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
            rpcUrls: [monadTestnet.rpcUrls.default.http[0]],
          },
        ],
      });
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    }
  }

  const balanceWei = await publicClient.getBalance({ address: walletAddress! });
  const balance = formatEther(balanceWei);

  return { connected: true, address: walletAddress, network: monadTestnet.name, balance };
}

export function getWalletAddress() {
  return walletAddress;
}

export function shortenAddress(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export const contractFunctions = {
  async createGoal({ stakeAmountEth, deadlineSeconds, category, description }: { stakeAmountEth: number; deadlineSeconds: number; category: number; description: string; }) {
    if (!walletClient || !walletAddress) throw new Error('Wallet not connected');
    const value = parseEther(String(stakeAmountEth));
    const hash = await walletClient.writeContract({
      chain: monadTestnet,
      address: CONTRACT_ADDRESS,
      abi: STAKE_CONTRACT_ABI,
      functionName: 'createGoal',
      account: walletAddress,
      value,
      args: [BigInt(deadlineSeconds), category, description],
    });
    return { hash };
  },
  async submitProof({ goalId, proofURI }: { goalId: number; proofURI: string }) {
    if (!walletClient || !walletAddress) throw new Error('Wallet not connected');
    const hash = await walletClient.writeContract({
      chain: monadTestnet,
      address: CONTRACT_ADDRESS,
      abi: STAKE_CONTRACT_ABI,
      functionName: 'submitProof',
      account: walletAddress,
      args: [BigInt(goalId), proofURI],
    });
    return { hash };
  },
  async withdrawStake({ goalId }: { goalId: number }) {
    if (!walletClient || !walletAddress) throw new Error('Wallet not connected');
    const hash = await walletClient.writeContract({
      chain: monadTestnet,
      address: CONTRACT_ADDRESS,
      abi: STAKE_CONTRACT_ABI,
      functionName: 'withdrawStake',
      account: walletAddress,
      args: [BigInt(goalId)],
    });
    return { hash };
  },
};

export async function fetchUserGoalsFromChain(address: `0x${string}`) {
  const goalIds = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: STAKE_CONTRACT_ABI,
    functionName: "getUserGoals",
    args: [address],
  })) as bigint[];

  if (!goalIds.length) return [];

  const goals = [];

  type RawGoal = readonly [
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    number,
    number,
    string,
    string,
  ];

  for (const goalId of goalIds) {
    const rawGoal = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: STAKE_CONTRACT_ABI,
      functionName: "getGoal",
      args: [goalId],
    })) as RawGoal;

    const [
      user,
      stakeAmount,
      deadline,
      createdAt,
      aiScore,
      status,
      category,
      description,
      proofURI,
    ] = rawGoal;

    goals.push({
      id: goalId,
      user,
      stakeAmount,
      deadline,
      createdAt,
      aiScore,
      status,
      category,
      description,
      proofURI,
    });
  }

  return goals;
}

/**
 * Fetch on-chain stats: total staked, goal count, and user streak
 */
export async function fetchOnChainStats(address?: `0x${string}`) {
  try {
    const totalStaked = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: STAKE_CONTRACT_ABI,
      functionName: "totalStaked",
    })) as bigint;

    const goalCounter = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: STAKE_CONTRACT_ABI,
      functionName: "goalCounter",
    })) as bigint;

    let currentStreak = BigInt(0);
    let highestStreak = BigInt(0);

    if (address) {
      const streakData = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: STAKE_CONTRACT_ABI,
        functionName: "getUserStreak",
        args: [address],
      })) as readonly [bigint, bigint];
      currentStreak = streakData[0];
      highestStreak = streakData[1];
    }

    return {
      totalStakedWei: totalStaked,
      totalStakedEth: Number(formatEther(totalStaked)),
      totalGoals: Number(goalCounter),
      currentStreak: Number(currentStreak),
      highestStreak: Number(highestStreak),
    };
  } catch (err) {
    console.error("Failed to fetch on-chain stats:", err);
    return null;
  }
}
