export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/ai/claude";
import { getUser, AuthError } from "@/lib/auth/get-user";

// ── Response schema ───────────────────────────────────────────────────────────

const insightSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(["warning", "tip", "achievement"]),
});

const insightsSchema = z.array(insightSchema).min(1).max(10);

type Insight = z.infer<typeof insightSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Also handle if wrapped in [ ] directly with surrounding prose
  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch) return arrayMatch[1].trim();
  return text.trim();
}

// ── GET /api/ai/insights ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getUser();

    const now = new Date();
    const threeMonthsAgo = startOfMonth(subMonths(now, 2));
    const periodEnd = endOfMonth(now);

    // Fetch last 3 months of transactions with category names
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: threeMonthsAgo, lte: periodEnd },
      },
      include: { category: true },
      orderBy: { date: "asc" },
    });

    if (transactions.length === 0) {
      return NextResponse.json<Insight[]>([
        {
          title: "Not enough data yet",
          description:
            "Add some transactions over the next few months and we'll surface insights about your spending patterns.",
          type: "tip",
        },
      ]);
    }

    // ── Aggregate by month → category ─────────────────────────────────────────
    type MonthData = {
      month: string;
      totalIncome: number;
      totalExpenses: number;
      categories: Record<string, { name: string; type: string; amount: number }>;
    };

    const monthMap = new Map<string, MonthData>();

    for (let i = 2; i >= 0; i--) {
      const key = format(subMonths(now, i), "yyyy-MM");
      monthMap.set(key, {
        month: format(subMonths(now, i), "MMMM yyyy"),
        totalIncome: 0,
        totalExpenses: 0,
        categories: {},
      });
    }

    for (const tx of transactions) {
      const key = format(tx.date, "yyyy-MM");
      const entry = monthMap.get(key);
      if (!entry) continue;

      const amount = Number(tx.amount);
      const catName = tx.category.name;

      if (tx.type === "INCOME") {
        entry.totalIncome += amount;
      } else {
        entry.totalExpenses += amount;
      }

      if (!entry.categories[catName]) {
        entry.categories[catName] = { name: catName, type: tx.type, amount: 0 };
      }
      entry.categories[catName].amount += amount;
    }

    // Serialise into a clean array for the prompt
    const spendingData = Array.from(monthMap.values()).map((m) => ({
      month: m.month,
      totalIncome: Math.round(m.totalIncome * 100) / 100,
      totalExpenses: Math.round(m.totalExpenses * 100) / 100,
      net: Math.round((m.totalIncome - m.totalExpenses) * 100) / 100,
      categories: Object.values(m.categories)
        .sort((a, b) => b.amount - a.amount)
        .map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100 })),
    }));

    // ── Call Claude ───────────────────────────────────────────────────────────
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: `You are a personal finance analyst. The user will provide 3 months of aggregated spending data in JSON format.

Respond with ONLY a valid JSON array (no prose, no markdown fences) containing 3–5 insight objects. Each object must have exactly:
- "title": short heading (max 8 words)
- "description": 1–2 sentence explanation with specific amounts/percentages where relevant
- "type": one of "warning" (overspending, negative trend), "tip" (actionable saving opportunity), or "achievement" (positive financial behaviour)

Rules:
- Use "warning" when a category is consistently high or growing month-over-month
- Use "achievement" when spending decreased, income increased, or net is positive
- Use "tip" for actionable suggestions based on the data
- All currency values are AUD
- Be specific — reference actual category names and amounts from the data`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Here is my spending data for the last 3 months:\n\n${JSON.stringify(spendingData, null, 2)}\n\nReturn the JSON array of insights.`,
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "[]";

    let insights: Insight[];
    try {
      const parsed = JSON.parse(extractJSON(raw));
      const validated = insightsSchema.safeParse(parsed);
      if (!validated.success) throw new Error("Invalid shape");
      insights = validated.data;
    } catch {
      console.error("[insights] Claude returned unexpected format:", raw);
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(insights);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/ai/insights]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
