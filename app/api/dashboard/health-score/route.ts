import { NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

type MonthlyIncomeRow = { month: string; total: string };

// ── Grade mapping ─────────────────────────────────────────────────────────────

type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

function toGrade(score: number): Grade {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

// ── Score calculators ─────────────────────────────────────────────────────────

function calcSavingsScore(savingsRate: number): number {
  if (savingsRate <= 0) return 0;
  if (savingsRate >= 0.3) return 25;
  if (savingsRate >= 0.2) return Math.round(20 + ((savingsRate - 0.2) / 0.1) * 5);
  if (savingsRate >= 0.1) return Math.round(10 + ((savingsRate - 0.1) / 0.1) * 10);
  return Math.round((savingsRate / 0.1) * 10);
}

// ── Tips generator ────────────────────────────────────────────────────────────

interface ComponentState {
  savingsScore: number;
  budgetScore: number;
  stabilityScore: number;
  diversityScore: number;
  savingsRate: number;
  avgBudgetRatio: number;
  topCategoryPct: number;
  incomeVariance: number;
  hasBudgets: boolean;
  monthsOfData: number;
}

function generateTips(s: ComponentState): string[] {
  const candidates: Array<{ score: number; tip: string }> = [];

  // Savings tips
  if (s.savingsRate <= 0) {
    candidates.push({
      score: s.savingsScore,
      tip: "Your expenses exceed your income this month. Audit your largest spending categories and identify items you can cut or defer.",
    });
  } else if (s.savingsScore < 25) {
    const pct = Math.round(s.savingsRate * 100);
    const target = pct < 10 ? 10 : 20;
    candidates.push({
      score: s.savingsScore,
      tip: `You're saving ${pct}% of your income. Aim for at least ${target}% — even small recurring cuts to discretionary spending compound quickly.`,
    });
  }

  // Budget adherence tips
  if (!s.hasBudgets) {
    candidates.push({
      score: s.budgetScore,
      tip: "Set monthly budgets for your top spending categories to start tracking adherence and limit overspending.",
    });
  } else if (s.budgetScore < 25) {
    const pct = Math.round(s.avgBudgetRatio * 100);
    if (s.budgetScore === 0) {
      candidates.push({
        score: s.budgetScore,
        tip: `You're averaging ${pct}% of your budgets — significantly over. Identify the most overspent categories and either reduce spending or adjust the budget to be realistic.`,
      });
    } else {
      candidates.push({
        score: s.budgetScore,
        tip: `Some categories are over budget (average usage: ${pct}%). Review those categories and consider setting tighter limits or shifting funds from underused budgets.`,
      });
    }
  }

  // Income stability tips
  if (s.monthsOfData < 3) {
    candidates.push({
      score: s.stabilityScore,
      tip: "Add at least 3 months of income transactions to unlock a full income stability assessment.",
    });
  } else if (s.stabilityScore < 25) {
    const variancePct = Math.round(s.incomeVariance * 100);
    if (s.stabilityScore === 5) {
      candidates.push({
        score: s.stabilityScore,
        tip: `Income varies by up to ${variancePct}% month to month. Build a 3–6 month emergency fund to cover expenses during lower-income periods.`,
      });
    } else {
      candidates.push({
        score: s.stabilityScore,
        tip: `Moderate income variance of ${variancePct}%. Consider supplementary income streams or a small emergency buffer to smooth out the gaps.`,
      });
    }
  }

  // Spending diversity tips
  if (s.diversityScore < 25) {
    const pct = Math.round(s.topCategoryPct * 100);
    if (s.diversityScore <= 10) {
      candidates.push({
        score: s.diversityScore,
        tip: `${pct}% of your spending is concentrated in a single category. Check whether this is intentional, and look for opportunities to reduce or redistribute that spend.`,
      });
    } else {
      candidates.push({
        score: s.diversityScore,
        tip: `Your top spending category accounts for ${pct}% of total expenses. Reviewing it could unlock meaningful savings.`,
      });
    }
  }

  // Sort by worst score first, return top 3
  candidates.sort((a, b) => a.score - b.score);
  const tips = candidates.map((c) => c.tip).slice(0, 3);

  // Always return at least one tip even for a perfect score
  if (tips.length === 0) {
    tips.push(
      "Great work! Keep maintaining your savings rate and staying within budget each month."
    );
  }

  return tips;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getUser();

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const threeMonthsAgo = startOfMonth(subMonths(now, 3));

    const [currentMonthByType, lastThreeMonthsIncome, currentBudgets, expensesByCategory] =
      await Promise.all([
        // Current month income + expenses
        prisma.transaction.groupBy({
          by: ["type"],
          where: {
            userId: user.id,
            date: { gte: currentMonthStart, lte: currentMonthEnd },
          },
          _sum: { amount: true },
        }),

        // Monthly income for the last 3 complete months (excludes current month)
        prisma.$queryRaw<MonthlyIncomeRow[]>`
          SELECT
            TO_CHAR(date, 'YYYY-MM')  AS month,
            CAST(SUM(amount) AS TEXT) AS total
          FROM transactions
          WHERE user_id   = ${user.id}
            AND type      = 'INCOME'
            AND date      >= ${threeMonthsAgo}
            AND date      <  ${currentMonthStart}
          GROUP BY TO_CHAR(date, 'YYYY-MM')
          ORDER BY month ASC
        `,

        // Current month budgets with category info
        prisma.budget.findMany({
          where: {
            userId: user.id,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          },
          include: { category: true },
        }),

        // Current month expenses by category — ordered desc so [0] is the top spender
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
      ]);

    // ── 1. Savings Rate (25 pts) ───────────────────────────────────────────────

    const income = Number(
      currentMonthByType.find((g) => g.type === "INCOME")?._sum.amount ?? 0
    );
    const expenses = Number(
      currentMonthByType.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0
    );
    const savings = income - expenses;
    const savingsRate = income > 0 ? savings / income : -1;

    const savingsScore = income <= 0 ? 0 : calcSavingsScore(savingsRate);

    const savingsDetails =
      income <= 0
        ? "No income recorded this month."
        : savingsRate <= 0
          ? `Spending $${expenses.toFixed(2)} against $${income.toFixed(2)} income — currently at a deficit.`
          : `Saving ${Math.round(savingsRate * 100)}% of income ($${savings.toFixed(2)} of $${income.toFixed(2)}).`;

    // ── 2. Budget Adherence (25 pts) ──────────────────────────────────────────

    let budgetScore: number;
    let budgetDetails: string;
    let avgBudgetRatio = 0;

    if (currentBudgets.length === 0) {
      budgetScore = 12; // Neutral — no budgets set
      budgetDetails = "No budgets set for this month.";
    } else {
      const ratios = currentBudgets.map((budget) => {
        const spending = expensesByCategory.find(
          (e) => e.categoryId === budget.categoryId
        );
        const spent = Number(spending?._sum.amount ?? 0);
        const budgetAmt = Number(budget.amount);
        return budgetAmt > 0 ? spent / budgetAmt : 0;
      });

      avgBudgetRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const allUnder = ratios.every((r) => r <= 1.0);
      const overCount = ratios.filter((r) => r > 1.0).length;

      if (allUnder) {
        budgetScore = 25;
        budgetDetails = `All ${currentBudgets.length} budget${currentBudgets.length !== 1 ? "s" : ""} on track (avg ${Math.round(avgBudgetRatio * 100)}% used).`;
      } else if (avgBudgetRatio < 0.9) {
        budgetScore = 20;
        budgetDetails = `${overCount} budget${overCount !== 1 ? "s" : ""} exceeded but overall average is ${Math.round(avgBudgetRatio * 100)}% — spending is contained.`;
      } else if (avgBudgetRatio < 1.1) {
        budgetScore = 10;
        budgetDetails = `${overCount} budget${overCount !== 1 ? "s" : ""} exceeded, averaging ${Math.round(avgBudgetRatio * 100)}% across all budgets.`;
      } else {
        budgetScore = 0;
        budgetDetails = `Significantly over budget — averaging ${Math.round(avgBudgetRatio * 100)}% across all categories.`;
      }
    }

    // ── 3. Income Stability (25 pts) ──────────────────────────────────────────

    const monthlyIncomeMap = new Map<string, number>();
    for (const row of lastThreeMonthsIncome) {
      monthlyIncomeMap.set(row.month, Number(row.total));
    }

    const priorMonthKeys = [1, 2, 3].map((n) =>
      format(subMonths(now, n), "yyyy-MM")
    );
    const priorIncomes = priorMonthKeys
      .map((k) => monthlyIncomeMap.get(k))
      .filter((v): v is number => v !== undefined);

    let stabilityScore: number;
    let stabilityDetails: string;
    let incomeVariance = 0;

    if (priorIncomes.length < 3) {
      stabilityScore = 15; // Neutral — insufficient data
      stabilityDetails = `Only ${priorIncomes.length} month${priorIncomes.length !== 1 ? "s" : ""} of income history available (need 3 for full assessment).`;
    } else {
      const mean = priorIncomes.reduce((a, b) => a + b, 0) / priorIncomes.length;
      const maxDeviation = Math.max(...priorIncomes.map((v) => Math.abs(v - mean)));
      incomeVariance = mean > 0 ? maxDeviation / mean : 0;

      if (incomeVariance <= 0.15) {
        stabilityScore = 25;
        stabilityDetails = `Income consistent — max variance ${Math.round(incomeVariance * 100)}% over the last 3 months.`;
      } else if (incomeVariance <= 0.3) {
        stabilityScore = 15;
        stabilityDetails = `Moderate income variance of ${Math.round(incomeVariance * 100)}% over the last 3 months.`;
      } else {
        stabilityScore = 5;
        stabilityDetails = `High income variance of ${Math.round(incomeVariance * 100)}% over the last 3 months.`;
      }
    }

    // ── 4. Spending Diversity (25 pts) ────────────────────────────────────────

    const totalExpenses = expensesByCategory.reduce(
      (sum, e) => sum + Number(e._sum.amount ?? 0),
      0
    );

    let diversityScore: number;
    let diversityDetails: string;
    let topCategoryPct = 0;

    if (totalExpenses === 0 || expensesByCategory.length === 0) {
      diversityScore = 20; // Neutral — no spending data
      diversityDetails = "No expense transactions recorded this month.";
    } else {
      const topAmount = Number(expensesByCategory[0]._sum.amount ?? 0);
      topCategoryPct = topAmount / totalExpenses;

      if (topCategoryPct < 0.3) {
        diversityScore = 25;
        diversityDetails = `Well diversified — top category is ${Math.round(topCategoryPct * 100)}% of total spending.`;
      } else if (topCategoryPct < 0.5) {
        diversityScore = 20;
        diversityDetails = `Moderately diversified — top category is ${Math.round(topCategoryPct * 100)}% of spending.`;
      } else if (topCategoryPct < 0.7) {
        diversityScore = 10;
        diversityDetails = `Over half of spending (${Math.round(topCategoryPct * 100)}%) is concentrated in a single category.`;
      } else {
        diversityScore = 5;
        diversityDetails = `${Math.round(topCategoryPct * 100)}% of spending is in one category — highly concentrated.`;
      }
    }

    // ── Aggregate ─────────────────────────────────────────────────────────────

    const totalScore = savingsScore + budgetScore + stabilityScore + diversityScore;

    const tips = generateTips({
      savingsScore,
      budgetScore,
      stabilityScore,
      diversityScore,
      savingsRate: Math.max(savingsRate, 0),
      avgBudgetRatio,
      topCategoryPct,
      incomeVariance,
      hasBudgets: currentBudgets.length > 0,
      monthsOfData: priorIncomes.length,
    });

    return NextResponse.json({
      totalScore,
      grade: toGrade(totalScore),
      components: {
        savingsRate:      { score: savingsScore,   maxScore: 25, details: savingsDetails  },
        budgetAdherence:  { score: budgetScore,    maxScore: 25, details: budgetDetails   },
        incomeStability:  { score: stabilityScore, maxScore: 25, details: stabilityDetails },
        spendingDiversity:{ score: diversityScore, maxScore: 25, details: diversityDetails },
      },
      tips,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/dashboard/health-score]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
