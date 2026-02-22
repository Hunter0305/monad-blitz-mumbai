import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WalletButton } from "@/components/WalletButton";
import { mockProofs } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";

const VerifierPanel = () => {
  const navigate = useNavigate();
  const [proofs, setProofs] = useState(mockProofs);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [txPending, setTxPending] = useState<string | null>(null);

  const handleAction = async (proofId: string, action: 'approve' | 'reject') => {
    setTxPending(proofId);
    await new Promise(r => setTimeout(r, 2000));
    setProofs(prev => prev.map(p =>
      p.id === proofId ? { ...p, status: action === 'approve' ? 'approved' as const : 'rejected' as const } : p
    ));
    setTxPending(null);
    setSelectedProof(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />

      <div className="flex-1">
        <header className="border-b border-border px-6 h-16 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <WalletButton />
        </header>

        <main className="p-6 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold mb-2">
              DAO <span className="gradient-text">Review Panel</span>
            </h1>
            <p className="text-muted-foreground mb-8">Review and verify submitted proofs.</p>

            <div className="space-y-4">
              {proofs.map((proof, i) => (
                <motion.div
                  key={proof.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{proof.goalTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        by <span className="font-mono">{proof.submitter}</span> • {proof.stakeAmount} {proof.currency}
                      </p>
                    </div>
                    <StatusBadge status={proof.status === 'approved' ? 'approved' : proof.status === 'rejected' ? 'failed' : 'pending'} />
                  </div>

                  <p className="text-sm text-foreground/80 mb-4">{proof.explanation}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{proof.fileName}</span>
                    </div>

                    {proof.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setSelectedProof(proof.id)}
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(proof.id, 'reject')}
                          disabled={txPending === proof.id}
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 gradient-btn border-0"
                          onClick={() => handleAction(proof.id, 'approve')}
                          disabled={txPending === proof.id}
                        >
                          {txPending === proof.id ? (
                            <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>

      {/* Proof Preview Modal */}
      <AnimatePresence>
        {selectedProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProof(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-8 max-w-lg w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-48 rounded-xl bg-secondary/50 flex items-center justify-center mb-4">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {proofs.find(p => p.id === selectedProof)?.fileName}
              </p>
              <Button variant="outline" onClick={() => setSelectedProof(null)}>Close Preview</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerifierPanel;
