import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

type Params = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const upload = await prisma.upload.findUnique({
      where: { id: params.id },
    });

    if (!upload || upload.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(upload);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/uploads/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
