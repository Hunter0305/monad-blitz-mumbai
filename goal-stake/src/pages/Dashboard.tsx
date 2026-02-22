import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Target, TrendingUp, Coins, Wallet, AlertCircle } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WalletButton } from "@/components/WalletButton";
import { GoalCard } from "@/components/GoalCard";
import { StatsCard } from "@/components/StatsCard";
import type { Goal } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { fetchUserGoalsFromChain, fetchOnChainStats, getWalletAddress, shortenAddress, connectWallet } from "@/lib/web3";
import { formatEther } from "viem";

const CATEGORY_NAMES = ["Health", "Work", "Learning", "Fitness", "Finance", "Other"];

type ExtendedGoal = Goal & { aiScore?: number; category?: string; canWithdraw?: boolean; proofURI?: string; rawStatus?: number };

const Dashboard = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<ExtendedGoal[]>([]);
  const [walletConnected, setWalletConnected] = useState(!!getWalletAddress());
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);
  const [onChainStats, setOnChainStats] = useState<{
    totalStakedEth: number;
    totalGoals: number;
    currentStreak: number;
    highestStreak: number;
  } | null>(null);

  const loadGoals = useCallback(async () => {
    const address = getWalletAddress();

    if (!address) {
      setWalletConnected(false);
      setGoals([]);
      return;
    }

    setWalletConnected(true);

    try {
      setLoadingGoals(true);
      setChainError(null);

      // Fetch goals and stats in parallel
      const [onChainGoals, stats] = await Promise.all([
        fetchUserGoalsFromChain(address),
        fetchOnChainStats(address),
      ]);

      if (stats) {
        setOnChainStats(stats);
      }

      if (onChainGoals.length === 0) {
        setGoals([]);
        setLoadingGoals(false);
        return;
      }

      const mapped: ExtendedGoal[] = onChainGoals.map(goal => {
        const statusValue = goal.status;
        let status: Goal["status"];

        if (statusValue === 1) {
          status = "approved";
        } else if (statusValue === 2) {
          status = "failed";
        } else if (statusValue === 0) {
          status = goal.proofURI ? "pending_review" : "active";
        } else {
          status = "pending_review";
        }

        return {
          id: goal.id.toString(),
          title: goal.description || `Goal #${goal.id.toString()}`,
          description: goal.description,
          stakeAmount: Number(formatEther(goal.stakeAmount)),
          currency: "ETH",
          deadline: new Date(Number(goal.deadline) * 1000),
          createdAt: new Date(Number(goal.createdAt) * 1000),
          status,
          proofSubmitted: !!goal.proofURI,
          proofURI: goal.proofURI || "",
          charity: "",
          owner: shortenAddress(goal.user),
          aiScore: Number(goal.aiScore),
          category: CATEGORY_NAMES[goal.category] || "Other",
          canWithdraw: statusValue === 1 && Number(goal.stakeAmount) > 0,
          rawStatus: statusValue,
        };
      });

      setGoals(mapped);
    } catch (e) {
      console.error("Failed to fetch goals from chain:", e);
      setChainError("Failed to load goals from chain. Check your network connection.");
      setGoals([]);
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const handleConnect = async () => {
    try {
      await connectWallet();
      setWalletConnected(true);
      await loadGoals();
    } catch (e) {
      console.error("Wallet connection failed:", e);
    }
  };

  const activeGoals = goals.filter(g => g.status === "active" || g.status === "pending_review");
  const completedGoals = goals.filter(g => g.status === "approved");
  const failedGoals = goals.filter(g => g.status === "failed");

  // Stats from chain or defaults
  const totalStaked = onChainStats?.totalStakedEth ?? 0;
  const totalGoalsCount = onChainStats?.totalGoals ?? goals.length;
  const streak = onChainStats?.currentStreak ?? 0;
  const successRate = goals.length > 0
    ? Math.round((completedGoals.length / goals.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />

      <div className="flex-1">
        {/* Top bar */}
        <header className="border-b border-border px-6 h-16 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2 lg:hidden">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-bold gradient-text">StakeYourGoal</span>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 text-xs">
              <div className="w-2 h-2 rounded-full bg-success" />
              Monad Testnet
            </div>
            <WalletButton onConnect={loadGoals} />
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto">
          {/* Connect wallet prompt */}
          {!walletConnected && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-10 text-center mb-8">
              <Wallet className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">Connect your wallet to view your goals, stats, and achievements from Monad Testnet.</p>
              <Button onClick={handleConnect} className="gradient-btn border-0 gap-2" size="lg">
                <Wallet className="w-4 h-4" /> Connect Wallet
              </Button>
            </motion.div>
          )}

          {/* Stats */}
          {walletConnected && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatsCard title="Total Staked" value={`${totalStaked.toFixed(2)} ETH`} icon={Coins} index={0} />
              <StatsCard title="Success Rate" value={`${successRate}%`} icon={TrendingUp} index={1} />
              <StatsCard title="Goals" value={totalGoalsCount} icon={Target} index={2} />
              <StatsCard title="Streak" value={`${streak} 🔥`} icon={Flame} index={3} subtitle={onChainStats ? `Best: ${onChainStats.highestStreak}` : undefined} />
            </div>
          )}

          {/* Achievements */}
          {walletConnected && goals.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-5 mb-8">
              <h3 className="text-sm font-semibold text-foreground mb-3">Achievements</h3>
              <div className="flex gap-3 flex-wrap">
                {completedGoals.length >= 1 && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary border border-primary/20">🏆 First Goal</span>
                )}
                {streak >= 3 && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary border border-primary/20">🔥 3-Streak</span>
                )}
                {totalStaked >= 1 && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary border border-primary/20">💎 1 ETH Staked</span>
                )}
                {completedGoals.length < 10 && (
                  <span className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground border border-border opacity-50">
                    🎯 10 Goals
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Chain error */}
          {chainError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-5 mb-8 border-destructive/30">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{chainError}</p>
              </div>
            </motion.div>
          )}

          {/* Active Goals */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">
              {walletConnected ? "Your Goals" : "Active Goals"}
            </h2>
            <Button onClick={() => navigate('/create-goal')} className="gradient-btn border-0 gap-2" size="sm">
              <Target className="w-4 h-4" /> New Goal
            </Button>
          </div>

          <div className="space-y-4 mb-10">
            {loadingGoals && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading goals from Monad Testnet...</p>
              </div>
            )}

            {!loadingGoals && walletConnected && goals.length === 0 && !chainError && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-10 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Goals Yet</h3>
                <p className="text-muted-foreground mb-6">Create your first goal and stake ETH to commit!</p>
                <Button onClick={() => navigate('/create-goal')} className="gradient-btn border-0 gap-2" size="lg">
                  <Target className="w-4 h-4" /> Create Your First Goal
                </Button>
              </motion.div>
            )}

            {activeGoals.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} onWithdraw={loadGoals} />
            ))}
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-4">
                Completed Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({completedGoals.length})</span>
              </h2>
              <div className="space-y-4 mb-10">
                {completedGoals.map((goal, i) => (
                  <GoalCard key={goal.id} goal={goal} index={i} onWithdraw={loadGoals} />
                ))}
              </div>
            </>
          )}

          {/* Failed Goals */}
          {failedGoals.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-4">
                Failed Goals
                <span className="ml-2 text-sm font-normal text-muted-foreground">({failedGoals.length})</span>
              </h2>
              <div className="space-y-4">
                {failedGoals.map((goal, i) => (
                  <GoalCard key={goal.id} goal={goal} index={i} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
