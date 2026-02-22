import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TransactionState } from "@/lib/web3";
import { contractFunctions } from "@/lib/web3";
import type { Goal } from "@/lib/mockData";
import { mockGoals, mockStats } from "@/lib/mockData";

interface StakeModalProps {
  open: boolean;
  onClose: () => void;
  stakeAmount: number;
  currency: string;
  onConfirm: () => void;
  deadlineSeconds?: number;
  description?: string;
  category?: number;
  charityLabel?: string;
}

export function StakeModal({
  open,
  onClose,
  stakeAmount,
  currency,
  onConfirm,
  deadlineSeconds = Math.floor(Date.now() / 1000) + 86400,
  description = "",
  category = 5,
  charityLabel = "",
}: StakeModalProps) {
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setErrorMsg(null);
      setTxState('waiting_signature');
      const tx = await contractFunctions.createGoal({
        stakeAmountEth: stakeAmount,
        deadlineSeconds,
        category,
        description,
      });
      setTxState('pending');
      setTimeout(() => {
        setTxState('confirmed');
        setTimeout(() => {
          const id = String(mockGoals.length + 1);
          const createdAt = new Date();
          const deadlineDate = new Date(deadlineSeconds * 1000);
          const newGoal: Goal = {
            id,
            title: description || `Goal ${id}`,
            description: description || "Custom goal",
            stakeAmount,
            currency,
            deadline: deadlineDate,
            createdAt,
            status: 'active',
            proofSubmitted: false,
            charity: charityLabel || "",
            owner: "You",
          };
          mockGoals.push(newGoal);
          mockStats.totalStaked += stakeAmount;
          mockStats.goalsCreated += 1;
          mockStats.activeGoals += 1;
          onConfirm();
          setTxState('idle');
          onClose();
        }, 1500);
      }, 2000);
    } catch (e) {
      console.error(e);
      setErrorMsg((e as Error).message || 'Transaction failed');
      setTxState('failed');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={txState === 'idle' ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card rounded-2xl p-6 max-w-md w-full gradient-border"
          onClick={(e) => e.stopPropagation()}
        >
          {txState === 'idle' && (
            <>
              <h3 className="text-xl font-bold text-foreground mb-4">Confirm Stake</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stake Amount</span>
                  <span className="font-bold gradient-text">{stakeAmount} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gas Estimate</span>
                  <span className="text-foreground">~0.002 MON</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-mono text-xs text-muted-foreground">Monad Testnet</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center gap-2 text-xs text-warning">
                  <AlertTriangle className="w-3 h-3" />
                  Funds will be locked until deadline
                </div>
                {errorMsg && <div className="text-xs text-destructive">{errorMsg}</div>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handleConfirm} className="flex-1 gradient-btn border-0">Confirm & Stake</Button>
              </div>
            </>
          )}

          {txState === 'waiting_signature' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Waiting for Signature</h3>
              <p className="text-sm text-muted-foreground">Please confirm the transaction in your wallet...</p>
            </div>
          )}

          {txState === 'pending' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Transaction Pending</h3>
              <p className="text-sm text-muted-foreground">Confirming on-chain...</p>
            </div>
          )}

          {txState === 'confirmed' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Transaction Confirmed!</h3>
              <p className="text-sm text-muted-foreground">Your stake has been locked.</p>
            </div>
          )}

          {txState === 'failed' && (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Transaction Failed</h3>
              <p className="text-sm text-muted-foreground">{errorMsg || 'Something went wrong. Please try again.'}</p>
              <Button onClick={() => setTxState('idle')} className="mt-4" variant="outline">Try Again</Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
