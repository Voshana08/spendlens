"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  email: string;
  name: string | null;
  currency: string;
};

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;
type Currency = (typeof CURRENCIES)[number];

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
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

  if (loading) {
    return (
      <div className="space-y-5 max-w-md">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md">
      {/* Email — read-only */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={profile?.email ?? ""}
          readOnly
          className="bg-muted text-muted-foreground cursor-default"
        />
        <p className="text-xs text-muted-foreground">
          Email is managed by your authentication provider.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <Label>Currency</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="w-full">
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

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ── Data tab ──────────────────────────────────────────────────────────────────

function DataTab() {
  const router = useRouter();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  // Delete transactions dialog
  const [deleteTxOpen, setDeleteTxOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState(false);

  // Delete account dialog — two-step with typed confirmation
  const [deleteAccOpen, setDeleteAccOpen] = useState(false);
  const [deleteAccStep, setDeleteAccStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState("");
  const [deletingAcc, setDeletingAcc] = useState(false);
  const confirmRef = useRef<HTMLInputElement>(null);

  // ── Download helper ─────────────────────────────────────────────────────────
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
      // Prefer the server-supplied filename from Content-Disposition
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

  // ── Delete all transactions ─────────────────────────────────────────────────
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

  // ── Delete account ──────────────────────────────────────────────────────────
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
      // Session is cleared server-side; redirect to login
      router.push("/login");
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setDeletingAcc(false);
    }
  };

  return (
    <div className="space-y-10 max-w-lg">
      {/* ── Exports ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Export data</h2>
          <p className="text-sm text-muted-foreground">
            Download a copy of your data at any time.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4 space-y-2">
            <p className="text-sm font-medium">Transactions CSV</p>
            <p className="text-xs text-muted-foreground">
              All transactions with date, description, amount, category, and
              source — compatible with spreadsheet apps.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleExport("csv")}
              disabled={exportingCsv}
            >
              <Download className="mr-2 size-3.5" />
              {exportingCsv ? "Preparing…" : "Download CSV"}
            </Button>
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <p className="text-sm font-medium">Full backup JSON</p>
            <p className="text-xs text-muted-foreground">
              All data including categories, budgets, and investments — useful
              for backup or migration.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleExport("json")}
              disabled={exportingJson}
            >
              <Download className="mr-2 size-3.5" />
              {exportingJson ? "Preparing…" : "Download JSON"}
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-destructive" />
          <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
        </div>
        <div className="rounded-xl border border-destructive/30 divide-y divide-destructive/20">
          {/* Delete all transactions */}
          <div className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">Delete all transactions</p>
              <p className="text-xs text-muted-foreground">
                Permanently removes every transaction. Categories and budgets
                are kept.
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

          {/* Delete account */}
          <div className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently deletes your account and all associated data. This
                cannot be undone.
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
        </div>
      </section>

      {/* ── Delete transactions dialog ─────────────────────────────────── */}
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

      {/* ── Delete account dialog (two-step) ──────────────────────────── */}
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, categories, and data.
        </p>
      </div>

      <Tabs defaultValue="profile" orientation="horizontal">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesSection />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
