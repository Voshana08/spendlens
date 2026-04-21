import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ── DELETE /api/user/account ──────────────────────────────────────────────────
// Permanently deletes the user's account and ALL associated data.
// Order matters: delete rows that reference categories before deleting categories.

export async function DELETE() {
  try {
    const user = await getUser();

    // Delete all user data in dependency order inside a transaction
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId: user.id } }),
      prisma.budget.deleteMany({ where: { userId: user.id } }),
      prisma.upload.deleteMany({ where: { userId: user.id } }),
      prisma.investment.deleteMany({ where: { userId: user.id } }),
      prisma.category.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    // Delete the Supabase auth user (requires service role key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        // Non-fatal: Prisma data is gone; log and continue so the client can still sign out
        console.error("[DELETE /api/user/account] Supabase auth delete failed:", error.message);
      }
    }

    // Sign out the current session so the cookie is cleared server-side
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/user/account]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
