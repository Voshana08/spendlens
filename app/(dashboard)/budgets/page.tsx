"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type BudgetProgress = {
  budgetId: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  spent: number;
  percentage: number;
};

type UnbudgetedCategory = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
};

type ProgressData = {
  budgetProgress: BudgetProgress[];
  unbudgeted: UnbudgetedCategory[];
  month: number;
  year: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getYearOptions() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1];
}

/** Tailwind class for the progress indicator based on percentage */
function progressColor(pct: number) {
  if (pct >= 100) return "[&_[data-slot=progress-indicator]]:bg-red-500";
  if (pct >= 75) return "[&_[data-slot=progress-indicator]]:bg-amber-500";
  return "[&_[data-slot=progress-indicator]]:bg-emerald-500";
}

/** Text colour for the percentage label */
function percentageColor(pct: number) {
  if (pct >= 100) return "text-red-500";
  if (pct >= 75) return "text-amber-500";
  return "text-emerald-600 dark:text-emerald-400";
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  type DialogMode =
    | { open: false }
    | { open: true; mode: "create"; unbudgeted: UnbudgetedCategory[] }
    | { open: true; mode: "edit"; budget: BudgetProgress };

  const [dialog, setDialog] = useState<DialogMode>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<BudgetProgress | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets/progress?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleted = async (budget: BudgetProgress) => {
    const res = await fetch(`/api/budgets/${budget.budgetId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success(`${budget.name} budget removed`);
      fetchData();
    } else {
      toast.error("Failed to delete budget");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Set monthly spending limits per category.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month selector */}
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year selector */}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getYearOptions().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() =>
              data &&
              setDialog({
                open: true,
                mode: "create",
                unbudgeted: data.unbudgeted,
              })
            }
            disabled={loading || !data?.unbudgeted.length}
          >
            <PlusCircle className="mr-2 size-4" />
            Set Budget
          </Button>
        </div>
      </div>

      {/* Budget cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : data?.budgetProgress.length === 0 && data.unbudgeted.length > 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No budgets set for this month.</p>
          <Button
            onClick={() =>
              setDialog({ open: true, mode: "create", unbudgeted: data.unbudgeted })
            }
          >
            <PlusCircle className="mr-2 size-4" />
            Set your first budget
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.budgetProgress.map((budget) => (
            <BudgetCard
              key={budget.budgetId}
              budget={budget}
              onEdit={() => setDialog({ open: true, mode: "edit", budget })}
              onDelete={() => setDeleteTarget(budget)}
            />
          ))}
        </div>
      )}

      {/* Unbudgeted categories */}
      {!loading && data && data.unbudgeted.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Categories without a budget</h2>
            <p className="text-sm text-muted-foreground">
              Add a spending limit to track these categories.
            </p>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.unbudgeted.map((cat) => (
              <div
                key={cat.categoryId}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span>{cat.icon}</span>
                  {cat.name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDialog({ open: true, mode: "create", unbudgeted: [cat] })
                  }
                >
                  <PlusCircle className="mr-1.5 size-3.5" />
                  Add Budget
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      {dialog.open && (
        <BudgetDialog
          mode={dialog.mode}
          month={month}
          year={year}
          unbudgeted={dialog.mode === "create" ? dialog.unbudgeted : []}
          budget={dialog.mode === "edit" ? dialog.budget : undefined}
          onClose={() => setDialog({ open: false })}
          onSaved={() => {
            setDialog({ open: false });
            fetchData();
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the{" "}
              <strong>
                {deleteTarget?.icon} {deleteTarget?.name}
              </strong>{" "}
              budget for {MONTHS[(deleteTarget?.budgetId ? month : 1) - 1]} {year}. Your
              transactions are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDeleted(deleteTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Budget card ───────────────────────────────────────────────────────────────

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: BudgetProgress;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const clamped = Math.min(budget.percentage, 100);
  const over = budget.percentage > 100;
  const overAmount = budget.spent - budget.amount;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{budget.icon}</span>
            <div>
              <CardTitle className="text-base">{budget.name}</CardTitle>
              {over && (
                <CardDescription className="text-red-500 dark:text-red-400">
                  {formatCurrency(overAmount)} over budget
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
              <Pencil className="size-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar with conditional colour */}
        <div className={progressColor(budget.percentage)}>
          <Progress value={clamped} className="h-2" />
        </div>

        {/* Amounts row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatCurrency(budget.spent)}
            </span>{" "}
            spent
          </span>
          <span className="text-muted-foreground">
            of {formatCurrency(budget.amount)}
          </span>
        </div>

        {/* Percentage */}
        <p className={`text-xs font-medium tabular-nums ${percentageColor(budget.percentage)}`}>
          {budget.percentage}% used
        </p>
      </CardContent>
    </Card>
  );
}

// ── Budget dialog (create / edit) ─────────────────────────────────────────────

function BudgetDialog({
  mode,
  month,
  year,
  unbudgeted,
  budget,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  month: number;
  year: number;
  unbudgeted: UnbudgetedCategory[];
  budget?: BudgetProgress;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState(
    mode === "edit" ? budget!.categoryId : unbudgeted[0]?.categoryId ?? ""
  );
  const [amount, setAmount] = useState(
    mode === "edit" ? String(budget!.amount) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }

    setSaving(true);

    let res: Response;
    if (mode === "edit") {
      res = await fetch(`/api/budgets/${budget!.budgetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });
    } else {
      res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount: parsed, month, year }),
      });
    }

    setSaving(false);

    if (res.ok || res.status === 201) {
      toast.success(mode === "edit" ? "Budget updated" : "Budget created");
      onSaved();
    } else {
      toast.error("Failed to save budget");
    }
  };

  const selectedCat =
    mode === "create"
      ? unbudgeted.find((c) => c.categoryId === categoryId)
      : { icon: budget!.icon, name: budget!.name };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Budget" : "Set Budget"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            {mode === "edit" ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <span>{budget!.icon}</span>
                <span>{budget!.name}</span>
              </div>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category">
                    {selectedCat && (
                      <span>
                        {selectedCat.icon} {selectedCat.name}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {unbudgeted.map((c) => (
                    <SelectItem key={c.categoryId} value={c.categoryId}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Monthly limit (AUD)</Label>
            <Input
              id="budget-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Period label */}
          <p className="text-xs text-muted-foreground">
            Budget period: {MONTHS[month - 1]} {year}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : mode === "edit" ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
