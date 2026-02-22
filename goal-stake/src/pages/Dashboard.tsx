import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Target, TrendingUp, Coins, Wallet } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { WalletButton } from "@/components/WalletButton";
import { GoalCard } from "@/components/GoalCard";
import { StatsCard } from "@/components/StatsCard";
import { mockGoals, mockStats } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { fetchUserGoalsFromChain, fetchOnChainStats, getWalletAddress, shortenAddress } from "@/lib/web3";
import { formatEther } from "viem";

const CATEGORY_NAMES = ["Health", "Work", "Learning", "Fitness", "Finance", "Other"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState(mockGoals);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [onChainStats, setOnChainStats] = useState<{
    totalStakedEth: number;
    totalGoals: number;
    currentStreak: number;
    highestStreak: number;
  } | null>(null);

  const loadGoals = useCallback(async () => {
    const address = getWalletAddress();

    if (!address) {
      setGoals(mockGoals);
      return;
    }

    try {
      setLoadingGoals(true);

      // Fetch goals and stats in parallel
      const [onChainGoals, stats] = await Promise.all([
        fetchUserGoalsFromChain(address),
        fetchOnChainStats(address),
      ]);

      if (stats) {
        setOnChainStats(stats);
      }

      const mapped = onChainGoals.map(goal => {
        const statusValue = goal.status;
        let status: (typeof mockGoals)[number]["status"];

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
          title: goal.description || `Goal ${goal.id.toString()}`,
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
      console.error(e);
      setGoals(mockGoals);
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const activeGoals = goals.filter(g => g.status === "active" || g.status === "pending_review");
  const completedGoals = goals.filter(g => g.status === "approved");
  const failedGoals = goals.filter(g => g.status === "failed");

  // Computed stats
  const totalStaked = onChainStats?.totalStakedEth ?? mockStats.totalStaked;
  const totalGoalsCount = onChainStats?.totalGoals ?? mockStats.goalsCreated;
  const streak = onChainStats?.currentStreak ?? mockStats.streak;
  const successRate = goals.length > 0
    ? Math.round((completedGoals.length / goals.length) * 100)
    : mockStats.successRate;

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
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard title="Total Staked" value={`${totalStaked.toFixed(2)} ETH`} icon={Coins} index={0} />
            <StatsCard title="Success Rate" value={`${successRate}%`} icon={TrendingUp} index={1} />
            <StatsCard title="Active Goals" value={activeGoals.length} icon={Target} index={2} />
            <StatsCard title="Streak" value={`${streak} 🔥`} icon={Flame} index={3} subtitle={onChainStats ? `Best: ${onChainStats.highestStreak}` : "Consecutive wins"} />
          </div>

          {/* Achievements */}
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
              {completedGoals.some(g => {
                const diff = g.deadline.getTime() - g.createdAt.getTime();
                return diff < 7 * 24 * 60 * 60 * 1000;
              }) && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary border border-primary/20">⚡ Speed Runner</span>
                )}
              {/* Locked badges */}
              {completedGoals.length < 10 && (
                <span className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground border border-border opacity-50">
                  🎯 10 Goals
                </span>
              )}
              {streak < 30 && (
                <span className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground border border-border opacity-50">
                  🌟 Perfect Month
                </span>
              )}
            </div>
          </motion.div>

          {/* Active Goals */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Active Goals</h2>
            <Button onClick={() => navigate('/create-goal')} className="gradient-btn border-0 gap-2" size="sm">
              <Target className="w-4 h-4" /> New Goal
            </Button>
          </div>
          <div className="space-y-4 mb-10">
            {loadingGoals && <div className="text-sm text-muted-foreground">Loading your goals from chain...</div>}
            {!loadingGoals && activeGoals.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No active goals yet. Create your first goal!</p>
                <Button onClick={() => navigate('/create-goal')} className="gradient-btn border-0">
                  Create Goal
                </Button>
              </div>
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
