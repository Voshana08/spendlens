import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Food",          icon: "🍔", color: "#F97316" },
  { name: "Transport",     icon: "🚗", color: "#3B82F6" },
  { name: "Utilities",     icon: "💡", color: "#EAB308" },
  { name: "Entertainment", icon: "🎬", color: "#8B5CF6" },
  { name: "Shopping",      icon: "🛍️", color: "#EC4899" },
  { name: "Health",        icon: "💊", color: "#10B981" },
  { name: "Salary",        icon: "💰", color: "#22C55E" },
  { name: "Other",         icon: "📦", color: "#6B7280" },
] as const;

export async function syncUser(supabaseUser: User) {
  const existing = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });

  if (existing) return existing;

  const emailPrefix = supabaseUser.email?.split("@")[0] ?? "User";
  const name = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  const user = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name,
      currency: "AUD",
      categories: {
        create: DEFAULT_CATEGORIES.map((cat) => ({
          ...cat,
          isDefault: true,
        })),
      },
    },
  });

  return user;
}
