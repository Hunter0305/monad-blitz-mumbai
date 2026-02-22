import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Trophy, Zap, Target, CheckCircle2, Lock, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/WalletButton";
import { GoalCard } from "@/components/GoalCard";
import { mockGoals } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const steps = [
  { icon: Target, title: "Set Your Goal", desc: "Define what you want to achieve with a clear deadline." },
  { icon: Lock, title: "Stake Crypto", desc: "Deposit ETH as your commitment. Skin in the game." },
  { icon: Clock, title: "Work Toward It", desc: "You have until the deadline. The countdown is real." },
  { icon: CheckCircle2, title: "Submit Proof", desc: "Provide evidence of completion for review." },
  { icon: Trophy, title: "Win or Donate", desc: "Get your stake back — or it goes to charity." },
];

const reasons = [
  { icon: TrendingUp, title: "Loss Aversion", desc: "Humans are 2x more motivated by potential loss than gain. We use that." },
  { icon: Shield, title: "Smart Contract Enforcement", desc: "No excuses. The blockchain doesn't care about your reasons." },
  { icon: Users, title: "Social Accountability", desc: "DAO reviewers verify your proof. No self-grading." },
  { icon: Zap, title: "Immediate Consequences", desc: "Miss your deadline? Funds auto-transfer to charity." },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg gradient-text">StakeYourGoal</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <WalletButton onConnect={() => navigate('/dashboard')} />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Stake Your Goal.{" "}
              <span className="gradient-text">No Excuses.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Lock crypto. Hit your goal. Or lose it to charity.
              <br />
              <span className="text-foreground/70">A decentralized time-locked goal commitment system.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <WalletButton onConnect={() => navigate('/dashboard')} />
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-border hover:bg-secondary/50"
                onClick={() => navigate('/create-goal')}
              >
                Create Goal <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-bold text-center mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
            Five steps to unbreakable accountability.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Why It Works */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-bold text-center mb-4">
            Why It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
            Built on behavioral economics, enforced by smart contracts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {reasons.map((reason, i) => (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 flex gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <reason.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground">{reason.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Demo Goal Card */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Live <span className="gradient-text">Preview</span>
        </h2>
        <p className="text-muted-foreground text-center mb-12">See what a goal looks like on-chain.</p>
        <div className="max-w-xl mx-auto">
          <GoalCard goal={mockGoals[0]} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-bold gradient-text">StakeYourGoal</span>
            </div>
            <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Smart Contract: </span>
              <span className="font-mono text-xs text-foreground">0x7a25...3f91</span>
              <span className="text-xs text-success">• Verified</span>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 StakeYourGoal. Decentralized accountability.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
