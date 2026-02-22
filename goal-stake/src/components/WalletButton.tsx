import { useState } from "react";
import { Wallet, LogOut, ChevronDown, Wifi, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortenAddress, connectWallet } from "@/lib/web3";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WalletButtonProps {
  onConnect?: () => void;
}

export function WalletButton({ onConnect }: WalletButtonProps) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [network, setNetwork] = useState<string>("Network");
  const [balance, setBalance] = useState<string>("0");

  const handleConnect = async () => {
    try {
      const state = await connectWallet();
      setConnected(true);
      setAddress(state.address);
      setNetwork(state.network);
      setBalance(state.balance);
      onConnect?.();
    } catch (e) {
      console.error(e);
      alert((e as Error).message || "Failed to connect wallet");
    }
  };

  if (!connected || !address) {
    return (
      <Button onClick={handleConnect} className="gradient-btn border-0 gap-2">
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 border-border bg-secondary/50">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-sm">{shortenAddress(address)}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem className="gap-2 text-muted-foreground">
          <Wifi className="w-4 h-4" />
          {network}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-muted-foreground">
          <Coins className="w-4 h-4" />
          {parseFloat(balance).toFixed(4)} MON
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-destructive"
          onClick={() => {
            setConnected(false);
            setAddress(null);
          }}
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
