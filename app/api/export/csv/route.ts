import { NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(escapeCsv).join(",");
}

// ── GET /api/export/csv ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getUser();

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const lines: string[] = [
      row([
        "Date",
        "Description",
        "Amount",
        "Type",
        "Category",
        "Source",
        "Recurring",
        "Recurrence Interval",
        "Created At",
      ]),
    ];

    for (const tx of transactions) {
      lines.push(
        row([
          format(tx.date, "yyyy-MM-dd"),
          tx.description,
          Number(tx.amount).toFixed(2),
          tx.type,
          tx.category.name,
          tx.source,
          tx.isRecurring,
          tx.recurrenceInterval ?? "",
          format(tx.createdAt, "yyyy-MM-dd'T'HH:mm:ss"),
        ])
      );
    }

    const csv = lines.join("\n");
    const filename = `spendlens-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/export/csv]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
