# Contracts — Smart Contracts for TimeVault

Foundry-based Solidity contracts for goal staking, verification, and NFT badges.

---

## 📋 Quick Start

### Prerequisites
- Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`  
- Node.js 18+

### Setup

```bash
# Install dependencies
forge install

# Set environment
cp .env.example .env
# Fill in PRIVATE_KEY for deployment

# Run tests
forge test

# Deploy to Monad Testnet
forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast
```

---

## 🔗 Contract Overview

### **StakeYourGoal.sol**
Main contract for goal creation, staking, and verification.

**Key Functions:**
- `createGoal(stakeAmount, deadline, category, description)` — Create new goal
- `submitProof(goalId, proofURI)` — Submit IPFS proof
- `setAIScore(goalId, score)` — AI verifier posts score
- `vote(goalId, support)` — Vote on disputed goals
- `withdrawStake(goalId)` — Claim winnings

**Status Schema:**
- `0` = active
- `1` = completed (approved)
- `2` = failed
- `3` = disputed

**Category Schema:**
- `0` = health
- `1` = work
- `2` = learning
- `3` = fitness
- `4` = finance
- `5` = other

---

### **GoalBadgeNFT.sol**
Soulbound ERC-721 NFT badges awarded on goal completion.

**Key Functions:**
- `mintBadge(user, goalId, category, streak)` — Mint achievement badge
- `burn(tokenId)` — User can revoke badge
- `getBadgeMetadata(tokenId)` — View badge info

**Features:**
- Soulbound (non-transferable)
- Tracks category and streak
- Metadata stored on-chain

---

## 📐 Smart Contract Design

### Goal Flow
```
User Stakes ETH
    ↓
Submits Proof (IPFS CID)
    ↓
AI Verifier Scores (via Groq)
    ↓
Score ≥75? → Auto Approved + Return Stake
Score 40-74? → DAO Vote
Score <40? → Auto Failed + To Charity
```

### Voting Flow
```
Disputed Goal (40-74 score)
    ↓
Users vote yes/no (7 days)
    ↓
Majority true? → Approved
Majority false? → Failed
```

---

## 🧪 Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match "testCreateGoal" -vvv

# Fuzz test
forge test --match "testFuzz" -vvv
```

**Coverage:**
```bash
forge coverage --report lcov
```

---

## 🚀 Deployment

### Monad Testnet

```bash
# 1. Set private key
export PRIVATE_KEY=0x...

# 2. Get testnet MON from faucet
# https://testnet-faucet.monad.xyz

# 3. Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast \
  --slow

# 4. Verify contracts (optional)
forge verify-contract <ADDRESS> StakeYourGoal \
  --chain-id 10143 \
  --etherscan-api-key <KEY>
```

### Output
```
StakeYourGoal deployed at: 0x...
GoalBadgeNFT deployed at: 0x...
```

Save these for frontend `.env.local`:
```env
NEXT_PUBLIC_STAKE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS=0x...
```

---

## 📦 Dependencies

- **OpenZeppelin** (via forge): ERC721, Ownable, ReentrancyGuard
- **Foundry**: Testing & deployment

---

## 🔐 Security Considerations

✅ **Reentrancy Guard** — Protects stake withdrawal  
✅ **Access Control** — Only AI verifier can set scores  
✅ **Safe Arithmetic** — Uses uint types properly  
✅ **Event Logging** — All state changes emit events  

⚠️ **Not audited** — For testnet use only

---

## 🧠 Function Breakdown

### `createGoal`
```solidity
function createGoal(
    uint256 stakeAmount,
    uint64 deadline,
    uint8 category,
    string memory description
) external payable nonReentrant returns (uint256)
```
- Requires `msg.value >= minimumStake`
- Deadline must be in future
- Returns goal ID
- Emits `GoalCreated` event

### `submitProof`
```solidity
function submitProof(
    uint256 goalId,
    string memory proofURI
) external
```
- Only goal creator can submit
- Stores IPFS CID
- Emits `ProofSubmitted` event (triggers backend listener)

### `setAIScore`
```solidity
function setAIScore(
    uint256 goalId,
    uint64 score
) external onlyAIVerifier
```
- Only called by AI verifier backend
- Auto-resolves if score >= 75 or < 40
- Initiates voting for 40-74 range
- Emits `AIScoredProof` event

---

## 📊 State Snapshot

```solidity
struct Goal {
    address user;              // Creator
    uint96 stakeAmount;        // ETH deposited
    uint64 deadline;           // Unix timestamp
    uint64 createdAt;          // When created
    uint64 aiScore;            // 0-100 or 0 if pending
    uint8 status;              // 0=active, 1=completed, 2=failed, 3=disputed
    uint8 category;            // Health, work, etc.
    string description;        // Goal text
    string proofURI;           // IPFS CID
}

struct Vote {
    uint256 yesVotes;          // Vote count
    uint256 noVotes;
    bool resolved;             // Voting complete?
    bool passed;               // Majority yes?
}
```

---

## 💥 Events for Indexing

```solidity
event GoalCreated(uint256 indexed goalId, address indexed user, uint256 stakeAmount, ...);
event ProofSubmitted(uint256 indexed goalId, address indexed user, string proofURI);
event AIScoredProof(uint256 indexed goalId, uint64 score, string reason);
event VoteCast(uint256 indexed goalId, address indexed voter, bool support);
event VoteResolved(uint256 indexed goalId, bool passed, uint256 yesVotes, uint256 noVotes);
event GoalResolved(uint256 indexed goalId, uint8 status);
event StakeWithdrawn(address indexed user, uint256 amount);
```

---

## 🔗 Next Steps

1. **Deploy** to Monad testnet
2. **Update frontend** with contract address
3. **Start backend** verifier service
4. **Test workflow**: Create goal → Submit proof → Get scored

---

See [../README.md](../README.md) for full project context.
