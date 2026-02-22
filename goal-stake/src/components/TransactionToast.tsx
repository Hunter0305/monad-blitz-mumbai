import { CheckCircle2, Loader2, XCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { TransactionState } from "@/lib/web3";

interface TransactionToastProps {
  state: TransactionState;
  hash?: string;
}

export function TransactionToast({ state, hash }: TransactionToastProps) {
  if (state === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 glass-card rounded-2xl p-4 min-w-[280px] z-50"
    >
      <div className="flex items-center gap-3">
        {state === 'waiting_signature' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
        {state === 'pending' && <Loader2 className="w-5 h-5 text-warning animate-spin" />}
        {state === 'confirmed' && <CheckCircle2 className="w-5 h-5 text-success" />}
        {state === 'failed' && <XCircle className="w-5 h-5 text-destructive" />}

        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {state === 'waiting_signature' && 'Awaiting Signature...'}
            {state === 'pending' && 'Transaction Pending'}
            {state === 'confirmed' && 'Transaction Confirmed'}
            {state === 'failed' && 'Transaction Failed'}
          </p>
          {hash && (
            <a href="#" className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline">
              View on Explorer <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
