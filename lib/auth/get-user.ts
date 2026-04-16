import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new AuthError();

  return dbUser;
}
