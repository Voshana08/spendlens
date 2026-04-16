import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

// Raw query returns SUM as text to avoid float precision issues
type TrendRow = { month: string; type: string; total: string };

export async function GET() {
  try {
    const user = await getUser();

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const sixMonthsAgo = startOfMonth(subMonths(now, 5)); // current month + 5 prior = 6 total

    // ── All queries run in parallel ───────────────────────────────────────────
    const [
      currentMonthAgg,
      lastMonthAgg,
      categorySpending,
      trendRaw,
      recentTransactions,
      budgets,
      allCategories,
    ] = await Promise.all([
      // Sum + count by type for current month
      prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId: user.id,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Sum by type for last month (for comparison)
      prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId: user.id,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),

      // Expenses grouped by category for current month
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId: user.id,
          type: "EXPENSE",
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),

      // Monthly income + expense totals for the last 6 months (raw SQL for date truncation)
      prisma.$queryRaw<TrendRow[]>`
        SELECT
          TO_CHAR(date, 'YYYY-MM')      AS month,
          type,
          CAST(SUM(amount) AS TEXT)     AS total
        FROM transactions
        WHERE user_id = ${user.id}
          AND date >= ${sixMonthsAgo}
        GROUP BY TO_CHAR(date, 'YYYY-MM'), type
        ORDER BY month ASC
      `,

      // Last 10 transactions with category
      prisma.transaction.findMany({
        where: { userId: user.id },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 10,
      }),

      // Current-month budgets with category details
      prisma.budget.findMany({
        where: {
          userId: user.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        include: { category: true },
      }),

      // All user categories (for spendingByCategory lookup)
      prisma.category.findMany({
        where: { userId: user.id },
      }),
    ]);

    // ── Current month summary ─────────────────────────────────────────────────
    const currentIncome = Number(
      currentMonthAgg.find((g) => g.type === "INCOME")?._sum.amount ?? 0
    );
    const currentExpenses = Number(
      currentMonthAgg.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0
    );
    const transactionCount = currentMonthAgg.reduce(
      (sum, g) => sum + g._count._all,
      0
    );

    // ── Last month summary ────────────────────────────────────────────────────
    const lastIncome = Number(
      lastMonthAgg.find((g) => g.type === "INCOME")?._sum.amount ?? 0
    );
    const lastExpenses = Number(
      lastMonthAgg.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0
    );

    // ── Spending by category ──────────────────────────────────────────────────
    const totalExpenses = categorySpending.reduce(
      (sum, c) => sum + Number(c._sum.amount ?? 0),
      0
    );

    const spendingByCategory = categorySpending.map((c) => {
      const cat = allCategories.find((a) => a.id === c.categoryId);
      const amount = Number(c._sum.amount ?? 0);
      return {
        categoryId: c.categoryId,
        name: cat?.name ?? "Unknown",
        icon: cat?.icon ?? "📦",
        color: cat?.color ?? "#6B7280",
        amount,
        percentage:
          totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      };
    });

    // ── Monthly trend (last 6 months) ─────────────────────────────────────────
    // Pre-populate all 6 months so months with no activity still appear
    const trendMap = new Map<string, { income: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) {
      trendMap.set(format(subMonths(now, i), "yyyy-MM"), {
        income: 0,
        expenses: 0,
      });
    }
    for (const row of trendRaw) {
      const entry = trendMap.get(row.month);
      if (!entry) continue;
      if (row.type === "INCOME") entry.income = Number(row.total);
      else entry.expenses = Number(row.total);
    }
    const monthlyTrend = Array.from(trendMap.entries()).map(
      ([month, data]) => ({ month, ...data })
    );

    // ── Budget progress ───────────────────────────────────────────────────────
    // Reuses categorySpending already fetched — no extra DB round-trip
    const budgetProgress = budgets.map((budget) => {
      const spending = categorySpending.find(
        (s) => s.categoryId === budget.categoryId
      );
      const spent = Number(spending?._sum.amount ?? 0);
      const budgetAmount = Number(budget.amount);
      return {
        categoryId: budget.categoryId,
        name: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,
        spent,
        budget: budgetAmount,
        percentage:
          budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
      };
    });

    return NextResponse.json({
      currentMonth: {
        income: currentIncome,
        expenses: currentExpenses,
        net: currentIncome - currentExpenses,
        transactionCount,
      },
      lastMonth: {
        income: lastIncome,
        expenses: lastExpenses,
        net: lastIncome - lastExpenses,
      },
      spendingByCategory,
      monthlyTrend,
      recentTransactions,
      budgetProgress,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/dashboard/summary]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
