import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const transactionBody = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  date: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).nullable().optional(),
});

type Params = { params: { id: string } };

// ── GET /api/transactions/[id] ────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { category: true },
    });

    if (!transaction || transaction.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/transactions/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PUT /api/transactions/[id] ────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.transaction.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = transactionBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { amount, type, categoryId, description, date, isRecurring, recurrenceInterval } =
      parsed.data;

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        amount,
        type: type as TransactionType,
        categoryId,
        description,
        date: new Date(date),
        isRecurring,
        recurrenceInterval: recurrenceInterval ?? null,
      },
      include: { category: true },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/transactions/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/transactions/[id] ─────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.transaction.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/transactions/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
