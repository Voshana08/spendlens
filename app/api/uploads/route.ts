import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

export async function GET() {
  try {
    const user = await getUser();

    const uploads = await prisma.upload.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      // Omit parsedData from the list — only fetch it on the detail route
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(uploads);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/uploads]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
