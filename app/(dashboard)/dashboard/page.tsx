import Link from "next/link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { SpendingTrendChart } from "@/components/dashboard/spending-trend-chart";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { BudgetProgressList } from "@/components/dashboard/budget-progress-list";
import { HealthScoreCard, type HealthScoreData } from "@/components/dashboard/health-score-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type Summary = {
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
  };
  lastMonth: { income: number; expenses: number; net: number };
  spendingByCategory: Array<{
    categoryId: string;
    name: string;
    icon: string;
    color: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
  recentTransactions: Array<{
    id: string;
    amount: string;
    type: "INCOME" | "EXPENSE";
    description: string;
    date: string;
    category: { name: string; icon: string; color: string };
  }>;
  budgetProgress: Array<{
    categoryId: string;
    name: string;
    icon: string;
    color: string;
    spent: number;
    budget: number;
    percentage: number;
  }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcTrend(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

async function fetchDashboard(): Promise<{
  summary: Summary | null;
  healthScore: HealthScoreData | null;
}> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const headers = { Cookie: cookieHeader };

  const [summaryRes, healthRes] = await Promise.all([
    fetch(`${baseUrl}/api/dashboard/summary`,      { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/dashboard/health-score`, { headers, cache: "no-store" }),
  ]);

  return {
    summary:     summaryRes.ok  ? await summaryRes.json()  : null,
    healthScore: healthRes.ok   ? await healthRes.json()   : null,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { summary, healthScore } = await fetchDashboard();

  if (!summary) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">
          Could not load dashboard data. Please refresh.
        </p>
      </div>
    );
  }

  const { currentMonth, lastMonth, spendingByCategory, monthlyTrend, recentTransactions, budgetProgress } = summary;
  const hasData = currentMonth.transactionCount > 0 || recentTransactions.length > 0;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-center">
        <div className="text-5xl">💰</div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Welcome to SpendLens!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start tracking your finances by adding your first transaction. Your
            dashboard will come alive with charts and insights.
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions">
            <Plus />
            Add your first transaction
          </Link>
        </Button>
      </div>
    );
  }

  // ── Trends ────────────────────────────────────────────────────────────────
  const incomeTrend = calcTrend(currentMonth.income, lastMonth.income);
  const expenseTrend = calcTrend(currentMonth.expenses, lastMonth.expenses);
  const netTrend = calcTrend(currentMonth.net, lastMonth.net);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Row 1 — Stat cards + health score */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Income this month"
          value={currentMonth.income}
          trend={incomeTrend}
          trendPositiveIsGood={true}
          variant="income"
        />
        <StatCard
          title="Expenses this month"
          value={currentMonth.expenses}
          trend={expenseTrend}
          trendPositiveIsGood={false}
          variant="expense"
        />
        <StatCard
          title="Net balance"
          value={currentMonth.net}
          trend={netTrend}
          trendPositiveIsGood={true}
          variant="net"
        />
        {healthScore && <HealthScoreCard {...healthScore} />}
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Income vs Expenses — last 6 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={monthlyTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spending by category — this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart data={spendingByCategory} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Recent transactions + budget progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={recentTransactions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget progress — this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetProgressList budgets={budgetProgress} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
