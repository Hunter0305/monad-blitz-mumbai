# Backend — AI Verifier Service

Node.js/TypeScript service that listens for goal proofs and scores them using Groq's Llama 3.3 model.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Deployed StakeYourGoal contract
- Monad testnet RPC access

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your values
# GROQ_API_KEY=gsk_...
# PRIVATE_KEY=0x...
# CONTRACT_ADDRESS=0x...
# RPC_URL=https://testnet-rpc.monad.xyz

# Start verifier
npm run dev
```

---

## 📋 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Free API key from Groq | `gsk_xxxx...` |
| `RPC_URL` | Monad testnet RPC | `https://testnet-rpc.monad.xyz` |
| `PRIVATE_KEY` | Verifier wallet (must have MON) | `0x...` |
| `CONTRACT_ADDRESS` | Deployed StakeYourGoal | `0x...` |
| `DATABASE_URL` | PostgreSQL (optional, for logging) | `postgres://...` |
| `SLACK_WEBHOOK_URL` | Slack notifications (optional) | `https://hooks.slack.com/...` |

---

## 🤖 How It Works

### 1. Event Listener
Watches for `ProofSubmitted` events on the StakeYourGoal contract:

```typescript
publicClient.watchContractEvent({
  address: CONTRACT_ADDRESS,
  eventName: "ProofSubmitted",
  onLogs: async (logs) => {
    // Process each proof
  }
});
```

### 2. IPFS Fetch
Retrieves proof content from IPFS:

```typescript
const proofText = await fetchProofFromIPFS(proofURI);
// Supports: Qm... (v0), bafy... (v1), full URLs
```

### 3. AI Scoring
Sends goal + proof to Llama 3.3 70B via Groq:

```typescript
const { score, reason } = await scoreProof(goalDescription, proofText);
// Returns: { score: 0-100, reason: "explanation" }
```

### 4. On-Chain Submit
Posts score to contract:

```typescript
const hash = await submitAIScore(walletClient, contractAddress, goalId, score);
// Contract auto-resolves based on score threshold
```

---

## 📁 Core Files

### [groq.ts](groq.ts)
**Groq + Llama 3.3 integration**

```typescript
export async function scoreProof(
  goalDescription: string,
  proofText: string
): Promise<{ score: number; reason: string }>
```

Uses system prompt:
```
You are a strict but fair goal completion verifier.
Score 0-100 based on how well proof evidences completion.
Respond ONLY in JSON: { "score": number, "reason": "..." }

Scoring guide:
- 75-100: Clear, specific proof
- 40-74:  Partial or ambiguous
- 0-39:   Vague or incomplete
```

### [chain.ts](chain.ts)
**viem client for Monad interaction**

Functions:
- `initializeClients()` — Setup viem with private key
- `getGoal()` — Fetch goal from contract
- `submitAIScore()` — Post score on-chain
- `watchProofSubmitted()` — Event listener

### [ipfs.ts](ipfs.ts)
**IPFS content retrieval**

Functions:
- `fetchProofFromIPFS(cidOrURL)` — Get proof text
- `parseProofContent(content)` — Extract from JSON/markdown/plain

### [verifier.ts](verifier.ts)
**Main service orchestrator**

- Sets up listeners
- Handles event processing
- Manages duplicate prevention
- Graceful shutdown on SIGINT

---

## 🔄 Processing Flow

```
Event: ProofSubmitted(goalId, proofURI)
  ↓
Check if already processing (avoid duplicates)
  ↓
Fetch goal from contract
  ↓
Fetch proof from IPFS
  ↓
Call Groq Llama 3.3 API
  ↓
Validate score 0-100
  ↓
Submit score on-chain via setAIScore()
  ↓
Mark goal as processed
  ↓
Log: "✅ Goal #X scored Y/100: reason"
```

---

## 📊 Groq Model Options

| Model | Speed | Quality | Use |
|-------|-------|---------|-----|
| `llama-3.3-70b-versatile` | ⚡ Fast | ⭐⭐⭐⭐⭐ | **Default** — Best balance |
| `llama-3.1-8b-instant` | ⚡⚡ Fastest | ⭐⭐⭐ | Fallback if rate limited |
| `mixtral-8x7b-32768` | ⚡ Medium | ⭐⭐⭐⭐ | Long texts (32k tokens) |

**Recommended:** `llama-3.3-70b-versatile`

**Free tier limits:**
- 14,400 requests/day
- 30 req/minute
- Perfect for proof scoring

---

## 🏃 Running

### Development
```bash
npm run dev
# Watches for changes, auto-restarts
# Output: "👂 Listening for ProofSubmitted events..."
```

### Production
```bash
npm run build
npm start
# or via PM2:
pm2 start dist/verifier.js --name "timevault-verifier"
```

### Docker
```bash
docker build -t timevault-verifier .
docker run -d --env-file .env timevault-verifier
```

---

## 🧪 Local Testing

### Deploy contracts locally
```bash
# Terminal 1: Start local Anvil fork
anvil --fork-url https://testnet-rpc.monad.xyz

# Terminal 2: Deploy to local
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast --private-key 0xac...

# Copy contract address to backend/.env
CONTRACT_ADDRESS=0x...
```

### Test proof submission
```bash
# Use cast to call contract
cast send 0x... "submitProof(uint256,string)" \
  1 "QmTestProof" \
  --private-key 0x... \
  --rpc-url http://localhost:8545

# Verifier will process in terminal
```

---

## 📊 Metrics & Monitoring

### Log Levels
```typescript
console.log("🔍 Processing proof...")  // Info
console.error("❌ Failed to process...")  // Error
console.log("✅ Score submitted...")  // Success
```

### Output Example
```
🚀 TimeVault AI Verifier starting...
=======================================
✅ Connected to Monad Testnet
📋 Contract: 0x7a25...3f91
🤖 Model: Llama 3.3 70B (via Groq)
=======================================

👂 Listening for ProofSubmitted events...

🔍 Proof submitted for goal #42
📥 Fetching goal details from contract...
🌐 Fetching proof from IPFS...
✅ Proof content fetched (245 characters)
🤖 Scoring proof with Llama 3.3 70B...
📊 AI Score: 87/100
💬 Reason: Clear evidence of course completion with certificate
⛓️  Submitting score on-chain...
✅ Transaction submitted: 0x12ab...
✨ Goal #42 completed!
```

---

## ⚙️ Configuration

### Groq Parameters
```typescript
groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  max_tokens: 300,  // Keep responses short
  messages: [...]
})
```

Adjust:
- `max_tokens` if responses too short (increase to 500)
- Model if rate limited (fallback to `llama-3.1-8b-instant`)

### Contract Interaction
```typescript
const STAKE_CONTRACT_ABI = [...];
const monadTestnet = { id: 10143, ... };
```

---

## 🔐 Security Best Practices

✅ **Environment variables** only (never hardcode keys)  
✅ **Private key rotation** — Use separate verifier wallet  
✅ **Error handling** — Doesn't crash on bad proofs  
✅ **Duplicate detection** — Prevents reprocessing  
✅ **IPFS validation** — Fetches with timeout  

---

## 🚀 Deployment Options

### Railway
```bash
railway up
# Set env vars in Railway dashboard
```

### Heroku
```bash
heroku create timevault-verifier
heroku config:set GROQ_API_KEY=...
git push heroku main
```

### AWS Lambda
Package as Node function, set env vars in Lambda console.

### Self-Hosted (VPS)
```bash
pm2 start npm --name "verifier" -- start
pm2 save
pm2 startup
```

---

## 📝 Development Notes

- Uses `viem` not `ethers.js` (modern, lighter)
- No database needed (stateless service)
- Graceful shutdown on SIGINT
- Duplicate processing prevented with Set
- IPFS gateway timeout: 30 seconds
- Groq timeout: API default (usually 30s)

---

## 🐛 Troubleshooting

### "GROQ_API_KEY not found"
```bash
export GROQ_API_KEY=gsk_...
npm run dev
```

### "Contract not found at address"
Check `.env` CONTRACT_ADDRESS is correct and deployed

### "Proof not found on IPFS"
- Verify CID is valid Qm... or bafy...
- Check IPFS gateway availability
- Use `fetch('https://w3s.link/ipfs/QmXXX')` manually

### Rate limited (429 error)
Groq free tier: 30 req/min. Wait or use smaller model.

---

See [../README.md](../README.md) for full project context.
