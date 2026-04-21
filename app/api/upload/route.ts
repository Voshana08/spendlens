export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UploadStatus, UploadType } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const BUCKET = "uploads";

const typeSchema = z.enum(["RECEIPT", "BANK_STATEMENT"]);

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    const formData = await request.formData();
    const file = formData.get("file");
    const rawType = formData.get("type");

    // ── Validate inputs ───────────────────────────────────────────────────────
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const parsedType = typeSchema.safeParse(rawType);
    if (!parsedType.success) {
      return NextResponse.json(
        { error: "type must be RECEIPT or BANK_STATEMENT" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB limit" },
        { status: 400 }
      );
    }

    // ── Upload to Supabase Storage ─────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`;

    const supabase = await createClient();
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      console.error("[POST /api/upload] Storage error:", storageError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // ── Create Upload record ───────────────────────────────────────────────────
    const upload = await prisma.upload.create({
      data: {
        userId: user.id,
        fileName: file.name,
        fileUrl: storagePath, // store the path; signed URLs generated on demand
        fileType: parsedType.data as UploadType,
        status: UploadStatus.PROCESSING,
      },
    });

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
