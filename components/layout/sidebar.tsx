"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Upload,
  Target,
  TrendingUp,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const NAV_ITEMS = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions",  icon: Receipt },
  { label: "Upload",       href: "/upload",        icon: Upload },
  { label: "Budgets",      href: "/budgets",       icon: Target },
  { label: "Investments",  href: "/investments",   icon: TrendingUp },
  { label: "Insights",     href: "/insights",      icon: Sparkles },
  { label: "Settings",     href: "/settings",      icon: Settings },
] as const;

interface SidebarProps {
  email: string;
}

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card px-3 py-4">
      {/* Logo */}
      <div className="mb-6 px-2">
        <span className="text-lg font-bold tracking-tight">💰 SpendLens</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + controls */}
      <div className="mt-4 border-t pt-4 space-y-2">
        <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
