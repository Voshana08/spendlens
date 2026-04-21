import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const query = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    const now = new Date();
    const parsed = query.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const month = parsed.data.month ?? now.getMonth() + 1;
    const year = parsed.data.year ?? now.getFullYear();

    // Build date range for spending query
    const periodStart = startOfMonth(new Date(year, month - 1, 1));
    const periodEnd = endOfMonth(new Date(year, month - 1, 1));

    const [budgets, categorySpending, allCategories] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: user.id, month, year },
        include: { category: true },
        orderBy: { category: { name: "asc" } },
      }),

      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId: user.id,
          type: "EXPENSE",
          date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),

      prisma.category.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
    ]);

    // Build set of category IDs that already have budgets
    const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));

    // Budgeted categories with spend data
    const budgetProgress = budgets.map((budget) => {
      const spending = categorySpending.find(
        (s) => s.categoryId === budget.categoryId
      );
      const spent = Number(spending?._sum.amount ?? 0);
      const budgetAmount = Number(budget.amount);
      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        name: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,
        amount: budgetAmount,
        spent,
        percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
      };
    });

    // Categories without a budget this month
    const unbudgeted = allCategories
      .filter((c) => !budgetedCategoryIds.has(c.id))
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      }));

    return NextResponse.json({ budgetProgress, unbudgeted, month, year });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/budgets/progress]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
