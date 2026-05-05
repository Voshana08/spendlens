import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";
import { Sidebar } from "@/components/layout/sidebar";
import { QuickAddButton } from "@/components/layout/quick-add-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await syncUser(user);

  return (
    <div className="flex h-screen">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
      <QuickAddButton />
    </div>
  );
}
