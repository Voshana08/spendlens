import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  /** % change vs last month. null = no prior data to compare */
  trend: number | null;
  /** Whether an upward trend is good (true for income/net, false for expenses) */
  trendPositiveIsGood?: boolean;
  variant?: "income" | "expense" | "net";
}

export function StatCard({
  title,
  value,
  trend,
  trendPositiveIsGood = true,
  variant = "net",
}: StatCardProps) {
  const valueColor =
    variant === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : variant === "expense"
      ? "text-red-500 dark:text-red-400"
      : value >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";

  // Is the trend direction good for this metric?
  const trendIsGood =
    trend === null
      ? null
      : trend > 0
      ? trendPositiveIsGood
      : !trendPositiveIsGood;

  const trendColor =
    trendIsGood === null
      ? "text-muted-foreground"
      : trendIsGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400";

  const TrendIcon =
    trend === null || trend === 0
      ? Minus
      : trend > 0
      ? TrendingUp
      : TrendingDown;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className={cn("text-2xl font-bold tabular-nums", valueColor)}>
          {formatCurrency(value)}
        </p>
        <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
          <TrendIcon className="size-3.5 shrink-0" />
          {trend === null ? (
            <span>No data last month</span>
          ) : (
            <span>
              {formatPercentage(Math.abs(trend))} vs last month
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
