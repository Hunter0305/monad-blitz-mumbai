import { useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "./StatusBadge";
import { CountdownTimer } from "./CountdownTimer";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import { contractFunctions, connectWallet, getWalletAddress } from "@/lib/web3";
import { Loader2, Wallet, CheckCircle2, Trophy, ExternalLink, Image, FileText } from "lucide-react";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

interface GoalCardProps {
  goal: Goal & { aiScore?: number; category?: string; canWithdraw?: boolean; proofURI?: string; rawStatus?: number };
  index?: number;
  onWithdraw?: () => void;
}

/** Render proof content based on CID type */
function ProofDisplay({ proofURI }: { proofURI: string }) {
  if (!proofURI) return null;

  // IPFS CID — render as image with link
  if (proofURI.startsWith("Qm") || proofURI.startsWith("bafy")) {
    const url = `${IPFS_GATEWAY}/${proofURI}`;
    return (
      <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt="Proof"
            className="w-full max-h-48 object-cover hover:opacity-90 transition-opacity"
            onError={(e) => {
              // If not an image, show as link instead
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                fallback.className = "flex items-center gap-2 p-3 text-xs text-primary";
                fallback.innerHTML = `<span>📎 View proof on IPFS</span>`;
                parent.appendChild(fallback);
              }
            }}
          />
          <div className="px-3 py-2 bg-secondary/30 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ExternalLink className="w-3 h-3" />
            <span className="font-mono truncate">{proofURI.substring(0, 20)}...</span>
          </div>
        </a>
      </div>
    );
  }

  // HTTP link
  if (proofURI.startsWith("http")) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <a
          href={proofURI}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate"
        >
          {proofURI}
        </a>
      </div>
    );
  }

  // Plain text
  return (
    <div className="mt-3 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
      <p className="line-clamp-2">{proofURI}</p>
    </div>
  );
}

/** Verification status badge based on contract status */
function VerificationBadge({ rawStatus, aiScore }: { rawStatus?: number; aiScore?: number }) {
  if (rawStatus === undefined) return null;

  switch (rawStatus) {
    case 0:
      if (aiScore && aiScore >= 40 && aiScore < 75) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            🟡 AI Uncertain: {aiScore}/100
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          ⏳ AI Reviewing...
        </span>
      );
    case 1:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ✅ Verified
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ Failed
        </span>
      );
    default:
      return null;
  }
}

export function GoalCard({ goal, index = 0, onWithdraw }: GoalCardProps) {
  const navigate = useNavigate();
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    try {
      setError(null);
      setWithdrawing(true);

      if (!getWalletAddress()) {
        await connectWallet();
      }

      await contractFunctions.withdrawStake({ goalId: parseInt(goal.id, 10) });
      setWithdrawn(true);

      if (onWithdraw) {
        setTimeout(onWithdraw, 1500);
      }
    } catch (e) {
      console.error("Withdraw failed:", e);
      setError((e as Error).message || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 mr-4">
          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {goal.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
          {/* Category, AI Score & Verification Status */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {goal.category && (
              <span className="px-2 py-0.5 rounded-full bg-secondary/80 text-xs font-medium text-muted-foreground">
                {goal.category}
              </span>
            )}
            {goal.aiScore !== undefined && goal.aiScore > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${goal.aiScore >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
                  goal.aiScore >= 40 ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-400'
                }`}>
                AI: {goal.aiScore}/100
              </span>
            )}
            <VerificationBadge rawStatus={goal.rawStatus} aiScore={goal.aiScore} />
          </div>
        </div>
        <CountdownTimer deadline={goal.deadline} size="sm" />
      </div>

      {/* Proof Display */}
      {goal.proofURI && goal.proofSubmitted && (
        <ProofDisplay proofURI={goal.proofURI} />
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Stake: </span>
            <span className="font-bold gradient-text">{goal.stakeAmount} {goal.currency}</span>
          </div>
          <StatusBadge status={goal.status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Withdraw button for completed goals */}
          {goal.canWithdraw && !withdrawn && (
            <Button
              size="sm"
              className="gap-1 gradient-btn border-0"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wallet className="w-3 h-3" />
              )}
              {withdrawing ? "Withdrawing..." : "Withdraw"}
            </Button>
          )}

          {/* Withdrawn confirmation */}
          {withdrawn && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Withdrawn
            </span>
          )}

          {/* Badge indicator for completed goals */}
          {goal.status === "approved" && (
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <Trophy className="w-3 h-3" /> Badge
            </span>
          )}

          {/* Submit proof / view details */}
          <Button
            size="sm"
            className={goal.status === 'active' && !goal.proofSubmitted ? 'gradient-btn border-0' : ''}
            variant={goal.status === 'active' && !goal.proofSubmitted ? 'default' : 'outline'}
            onClick={() => {
              if (goal.status === 'active' && !goal.proofSubmitted) {
                navigate(`/submit-proof/${goal.id}`);
              }
            }}
          >
            {goal.status === 'active' && !goal.proofSubmitted
              ? 'Submit Proof'
              : goal.status === 'pending_review'
                ? 'Under Review'
                : 'View Details'}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 text-xs text-destructive">
          {error}
        </div>
      )}
    </motion.div>
  );
}
