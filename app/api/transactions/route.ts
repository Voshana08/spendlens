import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TransactionType, TransactionSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

// ── Shared schema ─────────────────────────────────────────────────────────────

const transactionBody = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  date: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).nullable().optional(),
});

const listQuery = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ── GET /api/transactions ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    const parsed = listQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { type, categoryId, startDate, endDate, page, pageSize } = parsed.data;

    const where = {
      userId: user.id,
      ...(type && { type: type as TransactionType }),
      ...(categoryId && { categoryId }),
      ...((startDate ?? endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, pageSize });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/transactions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/transactions ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    const body = await request.json();
    const parsed = transactionBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { amount, type, categoryId, description, date, isRecurring, recurrenceInterval } =
      parsed.data;

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type: type as TransactionType,
        categoryId,
        description,
        date: new Date(date),
        isRecurring,
        recurrenceInterval: recurrenceInterval ?? null,
        source: TransactionSource.MANUAL,
        userId: user.id,
      },
      include: { category: true },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/transactions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
