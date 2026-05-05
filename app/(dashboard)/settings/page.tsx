"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  TriangleAlert,
  User,
  Tag,
  Database,
  Lock,
  FileSpreadsheet,
  FileJson2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoriesSection } from "@/components/settings/categories-section";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  email: string;
  name: string | null;
  currency: string;
};

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;
type Currency = (typeof CURRENCIES)[number];

type Section = "profile" | "categories" | "data";

const NAV_ITEMS: {
  id: Section;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}[] = [
  { id: "profile",    icon: User,     label: "Profile",       description: "Name & currency"     },
  { id: "categories", icon: Tag,      label: "Categories",    description: "Organise transactions" },
  { id: "data",       icon: Database, label: "Data & Privacy", description: "Export & delete"     },
];

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("AUD");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name ?? "");
        setCurrency((data.currency as Currency) ?? "AUD");
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, currency }),
      });
      if (!res.ok) throw new Error();
      const updated: Profile = await res.json();
      setProfile(updated);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (profile?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className="space-y-4">
      {/* Account identity card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Account</CardTitle>
          <CardDescription>Your sign-in identity.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Avatar className="size-14 shrink-0">
                <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5 min-w-0">
                <p className="font-medium truncate">
                  {name.trim() || "No name set"}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Lock className="size-3 shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email is managed by your authentication provider.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editable details card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Personal details</CardTitle>
          <CardDescription>
            Customise how you appear in the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {loading ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-10 w-40" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="max-w-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={currency}
                  onValueChange={(v) => setCurrency(v as Currency)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used as the display currency across the app.
                </p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ── Data section ──────────────────────────────────────────────────────────────

function DataSection() {
  const router = useRouter();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [deleteTxOpen, setDeleteTxOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState(false);
  const [deleteAccOpen, setDeleteAccOpen] = useState(false);
  const [deleteAccStep, setDeleteAccStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState("");
  const [deletingAcc, setDeletingAcc] = useState(false);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: "csv" | "json") => {
    const setter = format === "csv" ? setExportingCsv : setExportingJson;
    setter(true);
    try {
      const res = await fetch(`/api/export/${format}`);
      if (!res.ok) {
        toast.error("Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `spendlens-export.${format}`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed. Check your connection.");
    } finally {
      setter(false);
    }
  };

  const handleDeleteTransactions = async () => {
    setDeletingTx(true);
    try {
      const res = await fetch("/api/user/transactions", { method: "DELETE" });
      if (!res.ok) throw new Error();
      const { deleted } = await res.json();
      toast.success(`${deleted} transaction${deleted !== 1 ? "s" : ""} deleted`);
      setDeleteTxOpen(false);
    } catch {
      toast.error("Failed to delete transactions. Please try again.");
    } finally {
      setDeletingTx(false);
    }
  };

  const openDeleteAcc = () => {
    setDeleteAccStep(1);
    setConfirmInput("");
    setDeleteAccOpen(true);
  };

  const handleDeleteAccount = async () => {
    setDeletingAcc(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/login");
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setDeletingAcc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Download a copy of your data at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {/* CSV row */}
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileSpreadsheet className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Transactions CSV</p>
                <p className="text-xs text-muted-foreground">
                  Date, description, amount, category — spreadsheet ready
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => handleExport("csv")}
              disabled={exportingCsv}
            >
              <Download className="mr-1.5 size-3.5" />
              {exportingCsv ? "Preparing…" : "Download"}
            </Button>
          </div>

          {/* JSON row */}
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileJson2 className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Full backup JSON</p>
                <p className="text-xs text-muted-foreground">
                  All data including categories, budgets, and investments
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => handleExport("json")}
              disabled={exportingJson}
            >
              <Download className="mr-1.5 size-3.5" />
              {exportingJson ? "Preparing…" : "Download"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone card */}
      <Card className="border-destructive/40">
        <CardHeader className="border-b border-destructive/20">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-destructive" />
            <CardTitle className="text-destructive">Danger zone</CardTitle>
          </div>
          <CardDescription>
            These actions are permanent and cannot be reversed.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 divide-y divide-destructive/10">
          <div className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">Delete all transactions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes every transaction. Categories and budgets are kept.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteTxOpen(true)}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes your account and all associated data.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={openDeleteAcc}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete transactions dialog */}
      <AlertDialog open={deleteTxOpen} onOpenChange={setDeleteTxOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              Every transaction will be permanently deleted. Your categories,
              budgets, and investments are unaffected. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTx}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteTransactions}
              disabled={deletingTx}
            >
              {deletingTx ? "Deleting…" : "Yes, delete all transactions"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete account dialog — two-step */}
      <AlertDialog
        open={deleteAccOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteAccOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {deleteAccStep === 1
                ? "Are you absolutely sure?"
                : "Type DELETE to confirm"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteAccStep === 1 ? (
                  <p>
                    This will permanently delete your account, all transactions,
                    categories, budgets, investments, and uploaded documents.{" "}
                    <strong>There is no way to recover this data.</strong>
                  </p>
                ) : (
                  <>
                    <p>
                      Type <strong>DELETE</strong> in the box below to confirm
                      you want to permanently erase your account.
                    </p>
                    <Input
                      ref={confirmRef}
                      placeholder="DELETE"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      className="font-mono"
                      autoFocus
                    />
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingAcc}
              onClick={() => setDeleteAccOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            {deleteAccStep === 1 ? (
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteAccStep(2);
                  setTimeout(() => confirmRef.current?.focus(), 50);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={confirmInput !== "DELETE" || deletingAcc}
                onClick={handleDeleteAccount}
              >
                {deletingAcc ? "Deleting…" : "Delete my account"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("profile");

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, categories, and data.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8">
        {/* Left nav */}
        <nav className="w-52 shrink-0 space-y-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label, description }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                section === id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 mt-0.5 shrink-0 transition-colors",
                  section === id ? "text-foreground" : "text-muted-foreground"
                )}
              />
              <div>
                <p className="text-sm font-medium leading-none">{label}</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </nav>

        {/* Vertical divider */}
        <Separator orientation="vertical" className="self-stretch" />

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {section === "profile" && <ProfileSection />}
          {section === "categories" && <CategoriesSection />}
          {section === "data" && <DataSection />}
        </div>
      </div>
    </div>
  );
}
