import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

// ── DELETE /api/user/transactions ─────────────────────────────────────────────
// Permanently deletes ALL of the authenticated user's transactions.

export async function DELETE() {
  try {
    const user = await getUser();

    const { count } = await prisma.transaction.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/user/transactions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
