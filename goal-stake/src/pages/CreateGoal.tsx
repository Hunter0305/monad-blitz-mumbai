import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Coins, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StakeModal } from "@/components/StakeModal";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WalletButton } from "@/components/WalletButton";
import { Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateGoal = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [charity, setCharity] = useState("");
  const [showModal, setShowModal] = useState(false);

  const canSubmit = description && stakeAmount && deadline && charity;

  const deadlineSeconds = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : undefined;
  const charityCategory: Record<string, number> = {
    givedirectly: 0,
    gitcoin: 1,
    waterproject: 2,
    dao: 3,
  };
  const category = charity ? charityCategory[charity] ?? 0 : 0;

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
            <h1 className="text-3xl font-bold mb-2">
              Create <span className="gradient-text">New Goal</span>
            </h1>
            <p className="text-muted-foreground mb-8">Put your money where your mouth is.</p>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Goal Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="I will run a marathon in under 4 hours by training 5 days a week..."
                  className="bg-secondary/50 border-border rounded-xl min-h-[120px] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" /> Stake Amount (ETH)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.5"
                    className="bg-secondary/50 border-border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Deadline
                  </label>
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-secondary/50 border-border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Charity / DAO Pool
                </label>
                <Select value={charity} onValueChange={setCharity}>
                  <SelectTrigger className="bg-secondary/50 border-border rounded-xl">
                    <SelectValue placeholder="Select where failed stakes go" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="givedirectly">GiveDirectly</SelectItem>
                    <SelectItem value="gitcoin">Gitcoin Grants</SelectItem>
                    <SelectItem value="waterproject">The Water Project</SelectItem>
                    <SelectItem value="dao">DAO Community Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {canSubmit && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Goal Preview</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="font-bold gradient-text">{stakeAmount} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline</span>
                      <span className="text-foreground">{new Date(deadline).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">If failed</span>
                      <span className="text-foreground">{charity}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <Button
                onClick={() => setShowModal(true)}
                disabled={!canSubmit}
                className="w-full gradient-btn border-0 h-12 text-base"
                size="lg"
              >
                Stake & Commit
              </Button>
            </div>
          </motion.div>
        </main>
      </div>

      <StakeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        stakeAmount={parseFloat(stakeAmount) || 0}
        currency="ETH"
        description={description}
        deadlineSeconds={deadlineSeconds}
        category={category}
        charityLabel={charity}
        onConfirm={() => navigate('/dashboard')}
      />
    </div>
  );
};

export default CreateGoal;
