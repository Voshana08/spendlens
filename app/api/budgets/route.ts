import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const listQuery = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const budgetBody = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

// ── GET /api/budgets ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    const now = new Date();
    const parsed = listQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const month = parsed.data.month ?? now.getMonth() + 1;
    const year = parsed.data.year ?? now.getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id, month, year },
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/budgets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/budgets ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    const body = await request.json();
    const parsed = budgetBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { categoryId, amount, month, year } = parsed.data;

    // Verify category belongs to this user
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.userId !== user.id) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Upsert: one budget per user/category/month/year
    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: { userId: user.id, categoryId, month, year },
      },
      update: { amount },
      create: { userId: user.id, categoryId, amount, month, year },
      include: { category: true },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/budgets]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
