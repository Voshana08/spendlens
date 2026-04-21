export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TransactionSource, TransactionType, UploadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid(),
  description: z.string().min(1),
  date: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z
    .enum(["WEEKLY", "MONTHLY", "YEARLY"])
    .nullable()
    .optional(),
});

const bodySchema = z.object({
  transactions: z.array(transactionSchema).min(1),
});

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const upload = await prisma.upload.findUnique({ where: { id: params.id } });

    if (!upload || upload.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    // Derive the transaction source from the upload type
    const source =
      upload.fileType === UploadType.RECEIPT
        ? TransactionSource.AI_RECEIPT
        : TransactionSource.AI_STATEMENT;

    const created = await prisma.transaction.createMany({
      data: parsed.data.transactions.map((tx) => ({
        amount: tx.amount,
        type: tx.type as TransactionType,
        categoryId: tx.categoryId,
        description: tx.description,
        date: new Date(tx.date),
        isRecurring: tx.isRecurring,
        recurrenceInterval: tx.recurrenceInterval ?? null,
        source,
        userId: user.id,
      })),
    });

    return NextResponse.json({ created: created.count });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/uploads/[id]/confirm]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
