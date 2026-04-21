export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UploadStatus, UploadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";
import { parseBankStatement } from "@/lib/ai/claude";
import {
  downloadUpload,
  resolveCategoryId,
  markFailed,
} from "@/lib/ai/parse-helpers";

const bodySchema = z.object({ uploadId: z.string().uuid() });

export async function POST(request: NextRequest) {
  let uploadId: string | undefined;

  try {
    const user = await getUser();

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
    }
    uploadId = parsed.data.uploadId;

    // ── Fetch & authorise ──────────────────────────────────────────────────────
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });

    if (!upload || upload.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (upload.fileType !== UploadType.BANK_STATEMENT) {
      return NextResponse.json(
        { error: "Upload is not a bank statement" },
        { status: 400 }
      );
    }

    // ── Download + parse ───────────────────────────────────────────────────────
    const buffer = await downloadUpload(upload.fileUrl);

    let transactions;
    try {
      transactions = await parseBankStatement(buffer);
    } catch (aiError) {
      await markFailed(upload.id);
      throw aiError;
    }

    // ── Resolve categories for each transaction ────────────────────────────────
    const previews = await Promise.all(
      transactions.map(async (tx) => {
        const categoryId = await resolveCategoryId(
          user.id,
          tx.suggestedCategory
        );
        return {
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          date: tx.date,
          categoryId,
          isRecurring: false,
          recurrenceInterval: null,
          suggestedCategory: tx.suggestedCategory,
        };
      })
    );

    // ── Persist result ─────────────────────────────────────────────────────────
    const updatedUpload = await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: UploadStatus.COMPLETED,
        parsedData: { transactions, previews },
      },
    });

    return NextResponse.json({ upload: updatedUpload, previews });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/ai/parse-statement]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
