import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProofUpload } from "@/components/ProofUpload";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WalletButton } from "@/components/WalletButton";
import { CountdownTimer } from "@/components/CountdownTimer";
import { mockGoals } from "@/lib/mockData";
import { useNavigate, useParams } from "react-router-dom";
import { connectWallet, getWalletAddress, contractFunctions, type TransactionState } from "@/lib/web3";

const SubmitProof = () => {
  const navigate = useNavigate();
  const { goalId } = useParams();
  const goal = mockGoals.find(g => g.id === goalId) || mockGoals[0];
  const [file, setFile] = useState<File | null>(null);
  const [explanation, setExplanation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!getWalletAddress()) {
        await connectWallet();
      }

      const token = import.meta.env.VITE_PINATA_JWT as string | undefined;
      if (!token) throw new Error("Missing VITE_PINATA_JWT env for Pinata upload");

      setTxState('waiting_signature');

      let evidenceCid: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to upload file to Pinata");
        const data = (await res.json()) as { IpfsHash: string };
        evidenceCid = data.IpfsHash;
      }

      const proofText = explanation || "";
      const content = {
        proof: evidenceCid
          ? `${proofText}\n\nEvidence CID: ${evidenceCid} (ipfs://${evidenceCid})\nFile: ${file?.name}`
          : proofText || "No explanation provided",
        meta: {
          createdAt: new Date().toISOString(),
          goalId: goalId || goal.id,
        },
      };
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinataContent: content }),
      });
      if (!res.ok) throw new Error("Failed to upload proof metadata to Pinata");
      const jsonData = (await res.json()) as { IpfsHash: string };
      const proofCid = jsonData.IpfsHash;

      // Submit proof to contract with CID
      setTxState('pending');
      await contractFunctions.submitProof({ goalId: parseInt(goalId || goal.id, 10), proofURI: proofCid });

      // Simulate confirmation UI
      setTimeout(() => {
        setTxState('confirmed');
        setSubmitted(true);
      }, 1500);
    } catch (e) {
      console.error(e);
      setErrorMsg((e as Error).message || 'Submission failed');
      setTxState('failed');
    }
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

        <main className="p-6 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {!submitted ? (
              <>
                <h1 className="text-3xl font-bold mb-2">
                  Submit <span className="gradient-text">Proof</span>
                </h1>
                <p className="text-muted-foreground mb-8">Show us what you've accomplished.</p>

                {/* Goal info */}
                <div className="glass-card rounded-2xl p-5 mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{goal.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-muted-foreground">Stake: <span className="font-bold gradient-text">{goal.stakeAmount} {goal.currency}</span></span>
                      <StatusBadge status={goal.status} />
                    </div>
                  </div>
                  <CountdownTimer deadline={goal.deadline} size="md" />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Upload Proof</label>
                    <ProofUpload onFileSelect={setFile} />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Explanation (Optional)</label>
                    <Textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Describe your achievement and how you met the goal..."
                      className="bg-secondary/50 border-border rounded-xl min-h-[100px] resize-none"
                    />
                  </div>

                  {errorMsg && (
                    <div className="text-sm text-destructive">{errorMsg}</div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={txState === 'waiting_signature' || txState === 'pending'}
                    className="w-full gradient-btn border-0 h-12 text-base"
                    size="lg"
                  >
                    {txState === 'waiting_signature' ? 'Waiting for Wallet...' : txState === 'pending' ? 'Submitting...' : 'Submit Proof On-Chain'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">⏳</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Proof Submitted!</h2>
                  <p className="text-muted-foreground mb-2">Your proof is now waiting for AI verifier.</p>
                  <StatusBadge status="pending_review" />
                  <div className="mt-8">
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default SubmitProof;
