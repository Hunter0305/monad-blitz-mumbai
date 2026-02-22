import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Link, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ProofUpload } from "@/components/ProofUpload";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WalletButton } from "@/components/WalletButton";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useNavigate, useParams } from "react-router-dom";
import { connectWallet, getWalletAddress, contractFunctions, type TransactionState } from "@/lib/web3";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

type ProofTab = "file" | "text" | "link";

const SubmitProof = () => {
  const navigate = useNavigate();
  const { goalId } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [explanation, setExplanation] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [activeTab, setActiveTab] = useState<ProofTab>("file");
  const [submitted, setSubmitted] = useState(false);
  const [txState, setTxState] = useState<TransactionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);

  const pinataJwt = import.meta.env.VITE_PINATA_JWT as string | undefined;

  const uploadToPinata = async (content: File | Blob, isFile: boolean): Promise<string> => {
    if (!pinataJwt) throw new Error("VITE_PINATA_JWT not set. Add it to your .env.local file.");

    if (isFile) {
      const formData = new FormData();
      formData.append("file", content);
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${pinataJwt}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Pinata upload failed: ${res.statusText}`);
      const data = (await res.json()) as { IpfsHash: string };
      return data.IpfsHash;
    } else {
      // Upload as JSON
      const textContent = await (content as Blob).text();
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pinataContent: {
            proof: textContent,
            goalId: goalId,
            createdAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error(`Pinata upload failed: ${res.statusText}`);
      const data = (await res.json()) as { IpfsHash: string };
      return data.IpfsHash;
    }
  };

  const handleSubmit = async () => {
    try {
      setErrorMsg(null);
      if (!getWalletAddress()) {
        await connectWallet();
      }

      setTxState('waiting_signature');

      let proofValue = "";

      if (activeTab === "file" && file) {
        // Upload file to Pinata → get CID
        if (pinataJwt) {
          const cid = await uploadToPinata(file, true);
          proofValue = cid;
          setUploadedCid(cid);
        } else {
          proofValue = `file:${file.name}`;
        }
      } else if (activeTab === "link" && linkUrl) {
        // Submit link directly (no IPFS needed)
        proofValue = linkUrl;
      } else if (activeTab === "text" && explanation) {
        // Upload text proof to Pinata as JSON → get CID
        if (pinataJwt) {
          const blob = new Blob([explanation], { type: "text/plain" });
          const cid = await uploadToPinata(blob, false);
          proofValue = cid;
          setUploadedCid(cid);
        } else {
          proofValue = explanation;
        }
      } else {
        throw new Error("Please provide proof: upload a file, enter text, or paste a link.");
      }

      // Submit proof CID/URL to contract
      setTxState('pending');
      await contractFunctions.submitProof({
        goalId: parseInt(goalId || "0", 10),
        proofURI: proofValue,
      });

      setTxState('confirmed');
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setErrorMsg((e as Error).message || 'Submission failed');
      setTxState('failed');
    }
  };

  const isSubmitting = txState === 'waiting_signature' || txState === 'pending';

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
                <p className="text-muted-foreground mb-8">
                  Upload evidence for Goal #{goalId}. Your proof will be stored on IPFS via Pinata.
                </p>

                {/* Pinata status indicator */}
                <div className={`flex items-center gap-2 mb-6 px-3 py-2 rounded-lg text-xs ${pinataJwt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${pinataJwt ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {pinataJwt
                    ? "Pinata IPFS connected — proofs will be stored permanently"
                    : "Pinata not configured — add VITE_PINATA_JWT to .env.local for IPFS storage"}
                </div>

                {/* Proof type tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 mb-6">
                  {([
                    { value: "file" as ProofTab, icon: Upload, label: "File Upload" },
                    { value: "text" as ProofTab, icon: FileText, label: "Text" },
                    { value: "link" as ProofTab, icon: Link, label: "Link" },
                  ]).map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.value
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {/* File upload tab */}
                  {activeTab === "file" && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Upload Evidence</label>
                      <ProofUpload onFileSelect={setFile} />
                      {file && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Selected: <span className="text-foreground font-mono">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Text tab */}
                  {activeTab === "text" && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Describe Your Proof</label>
                      <Textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Describe your achievement and how you met the goal..."
                        className="bg-secondary/50 border-border rounded-xl min-h-[150px] resize-none"
                      />
                    </div>
                  )}

                  {/* Link tab */}
                  {activeTab === "link" && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Proof URL</label>
                      <Input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com/my-proof or ipfs://Qm..."
                        className="bg-secondary/50 border-border rounded-xl"
                      />
                    </div>
                  )}

                  {errorMsg && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{errorMsg}</div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full gradient-btn border-0 h-12 text-base gap-2"
                    size="lg"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {txState === 'waiting_signature'
                      ? 'Uploading to IPFS...'
                      : txState === 'pending'
                        ? 'Submitting On-Chain...'
                        : 'Submit Proof'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Proof Submitted!</h2>
                  <p className="text-muted-foreground mb-2">Your proof is on-chain and waiting for AI verification.</p>
                  {uploadedCid && (
                    <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-xs font-mono text-muted-foreground">
                      <p className="text-foreground font-sans text-sm font-medium mb-1">IPFS CID:</p>
                      <a
                        href={`${IPFS_GATEWAY}/${uploadedCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {uploadedCid}
                      </a>
                    </div>
                  )}
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
