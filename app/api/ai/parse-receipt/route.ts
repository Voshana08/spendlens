export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UploadStatus, UploadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";
import { parseReceipt } from "@/lib/ai/claude";
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

    if (upload.fileType !== UploadType.RECEIPT) {
      return NextResponse.json(
        { error: "Upload is not a receipt" },
        { status: 400 }
      );
    }

    // ── Download + parse ───────────────────────────────────────────────────────
    const buffer = await downloadUpload(upload.fileUrl);

    let receiptData;
    try {
      receiptData = await parseReceipt(buffer);
    } catch (aiError) {
      await markFailed(upload.id);
      throw aiError;
    }

    // ── Resolve category ───────────────────────────────────────────────────────
    const categoryId = await resolveCategoryId(
      user.id,
      receiptData.suggestedCategory
    );

    // Build the transaction preview (not saved yet — user confirms first)
    const preview = {
      description: receiptData.merchant,
      amount: receiptData.amount,
      type: "EXPENSE" as const,
      date: receiptData.date,
      categoryId,
      isRecurring: false,
      recurrenceInterval: null,
      items: receiptData.items,
      suggestedCategory: receiptData.suggestedCategory,
    };

    // ── Persist result ─────────────────────────────────────────────────────────
    const updatedUpload = await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: UploadStatus.COMPLETED,
        parsedData: { receipt: receiptData, preview },
      },
    });

    return NextResponse.json({ upload: updatedUpload, preview });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/ai/parse-receipt]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
