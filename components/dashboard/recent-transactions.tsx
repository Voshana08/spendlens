import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecentTransaction {
  id: string;
  amount: string; // Prisma Decimal serialised as string
  type: "INCOME" | "EXPENSE";
  description: string;
  date: string;
  category: { name: string; icon: string; color: string };
}

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors"
        >
          {/* Category icon on tinted background */}
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
            style={{ backgroundColor: tx.category.color + "33" }}
          >
            {tx.category.icon}
          </div>

          {/* Description + date */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tx.description}</p>
            <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
          </div>

          {/* Amount */}
          <span
            className={cn(
              "shrink-0 text-sm font-medium tabular-nums",
              tx.type === "INCOME"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            )}
          >
            {tx.type === "INCOME" ? "+" : "−"}
            {formatCurrency(Number(tx.amount))}
          </span>
        </div>
      ))}

      <div className="pt-2">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all transactions
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
