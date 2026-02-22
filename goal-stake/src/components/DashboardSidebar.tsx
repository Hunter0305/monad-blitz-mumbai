import { Target, PlusCircle, Users, User, Trophy, LayoutDashboard } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Target, label: "My Goals", path: "/dashboard" },
  { icon: PlusCircle, label: "Create Goal", path: "/create-goal" },
  { icon: Users, label: "DAO Pool", path: "/verifier" },
  { icon: User, label: "Profile", path: "/dashboard" },
];

export function DashboardSidebar() {
  return (
    <aside className="w-64 min-h-screen border-r border-border bg-card/50 p-4 hidden lg:block">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Trophy className="w-6 h-6 text-primary" />
        <span className="font-bold text-lg gradient-text">StakeYourGoal</span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 glass-card rounded-2xl p-4">
        <p className="text-xs text-muted-foreground mb-2">Contract</p>
        <p className="font-mono text-xs text-foreground break-all">0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D</p>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-xs text-success">Verified on Etherscan</span>
        </div>
      </div>
    </aside>
  );
}
