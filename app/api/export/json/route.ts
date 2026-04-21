import { NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

// ── GET /api/export/json ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getUser();

    const [transactions, categories, budgets, investments] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: user.id },
        include: { category: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.category.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: { select: { name: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
      prisma.investment.findMany({
        where: { userId: user.id },
        orderBy: { purchaseDate: "desc" },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      profile: {
        email: user.email,
        name: user.name,
        currency: user.currency,
        memberSince: user.createdAt,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        date: format(tx.date, "yyyy-MM-dd"),
        description: tx.description,
        amount: Number(tx.amount),
        type: tx.type,
        category: tx.category.name,
        source: tx.source,
        isRecurring: tx.isRecurring,
        recurrenceInterval: tx.recurrenceInterval,
        createdAt: tx.createdAt,
      })),
      categories: categories.map((c) => ({
        name: c.name,
        icon: c.icon,
        color: c.color,
        isDefault: c.isDefault,
      })),
      budgets: budgets.map((b) => ({
        category: b.category.name,
        amount: Number(b.amount),
        month: b.month,
        year: b.year,
      })),
      investments: investments.map((i) => ({
        name: i.name,
        type: i.type,
        buyPrice: Number(i.buyPrice),
        quantity: Number(i.quantity),
        currentValue: Number(i.currentValue),
        purchaseDate: format(i.purchaseDate, "yyyy-MM-dd"),
        notes: i.notes,
        createdAt: i.createdAt,
      })),
    };

    const json = JSON.stringify(exportData, null, 2);
    const filename = `spendlens-backup-${format(new Date(), "yyyy-MM-dd")}.json`;

    return new Response(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/export/json]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
