"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, Unlock, Gift, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCreditStore } from "@/stores/credit-store";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

function getTransactionIcon(type: string) {
  switch (type) {
    case "SIGNUP_BONUS":
      return <Gift className="h-4 w-4 text-green-500" />;
    case "CONTACT_REVEAL":
      return <Unlock className="h-4 w-4 text-red-500" />;
    case "PURCHASE":
      return <CreditCard className="h-4 w-4 text-blue-500" />;
    default:
      return <Sparkles className="h-4 w-4 text-muted-foreground" />;
  }
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function CreditBalance() {
  const { balance, isLoaded, isAnimating, setBalance, setIsAnimating } =
    useCreditStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [open, setOpen] = useState(false);

  // Hydrate balance on mount
  useEffect(() => {
    async function loadBalance() {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch {
        // Silently fail -- balance stays at 0
      }
    }
    loadBalance();
  }, [setBalance]);

  // Reset animation after 600ms
  useEffect(() => {
    if (!isAnimating) return;
    const timeout = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timeout);
  }, [isAnimating, setIsAnimating]);

  // Load transaction history on popover open
  const loadHistory = useCallback(async () => {
    if (isLoadingHistory) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/credits/history?pageSize=5");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isLoadingHistory]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadHistory();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Credits</span>
          <span
            className={`ml-auto font-mono tabular-nums font-medium transition-colors duration-300 ${
              isAnimating ? "text-red-500" : ""
            }`}
          >
            {isLoaded ? balance : "--"}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-72 p-0"
        sideOffset={8}
      >
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Recent Transactions</p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx._id} className="flex items-center gap-3 px-4 py-2.5">
                  {getTransactionIcon(tx.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">
                      {tx.description || tx.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(tx.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono tabular-nums font-medium ${
                      tx.amount > 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2.5">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all transactions
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
