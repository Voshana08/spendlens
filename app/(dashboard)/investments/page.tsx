"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatCurrency, formatPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AllocationCharts } from "@/components/investments/allocation-charts";
import { HoldingsTable } from "@/components/investments/holdings-table";
import { InvestmentFormDialog } from "@/components/investments/investment-form-dialog";
import type { Investment } from "@/components/investments/types";
import {
  holdingCost,
  holdingValue,
} from "@/components/investments/types";

// ── Stat card ─────────────────────────────────────────────────────────────────

function InvestmentStatCard({
  title,
  value,
  sub,
  subPositiveIsGood = true,
}: {
  title: string;
  value: number;
  sub?: { label: string; direction: "up" | "down" | "flat" };
  subPositiveIsGood?: boolean;
}) {
  const valueColor =
    title === "Total P&L"
      ? value > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : value < 0
        ? "text-red-500"
        : "text-foreground"
      : "text-foreground";

  const subGood =
    !sub
      ? null
      : sub.direction === "up"
      ? subPositiveIsGood
      : sub.direction === "down"
      ? !subPositiveIsGood
      : null;

  const subColor =
    subGood === null
      ? "text-muted-foreground"
      : subGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-500";

  const SubIcon =
    !sub || sub.direction === "flat"
      ? Minus
      : sub.direction === "up"
      ? TrendingUp
      : TrendingDown;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className={cn("text-2xl font-bold tabular-nums", valueColor)}>
          {formatCurrency(value)}
        </p>
        {sub && (
          <div className={cn("flex items-center gap-1 text-xs", subColor)}>
            <SubIcon className="size-3.5 shrink-0" />
            <span>{sub.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Investment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/investments");
      if (!res.ok) throw new Error();
      setInvestments(await res.json());
    } catch {
      toast.error("Failed to load investments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const handleEdit = (inv: Investment) => {
    setEditTarget(inv);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditTarget(null);
  };

  const handleDelete = async (inv: Investment) => {
    const res = await fetch(`/api/investments/${inv.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success(`${inv.name} removed`);
      fetchInvestments();
    } else {
      toast.error("Failed to delete investment");
    }
    setDeleteTarget(null);
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalInvested = investments.reduce((s, i) => s + holdingCost(i), 0);
  const currentValue = investments.reduce((s, i) => s + holdingValue(i), 0);
  const pnl = currentValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  const pnlDirection: "up" | "down" | "flat" =
    pnl > 0 ? "up" : pnl < 0 ? "down" : "flat";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground">Track your portfolio performance.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusCircle className="mr-2 size-4" />
          Add Investment
        </Button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <InvestmentStatCard title="Total Invested" value={totalInvested} />
          <InvestmentStatCard title="Current Value" value={currentValue} />
          <InvestmentStatCard
            title="Total P&L"
            value={pnl}
            sub={
              totalInvested > 0
                ? {
                    label: `${formatPercentage(Math.abs(pnlPct), false)} return`,
                    direction: pnlDirection,
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* Allocation charts */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <AllocationCharts investments={investments} />
      )}

      {/* Holdings table */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Holdings</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <HoldingsTable
            investments={investments}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      {/* Add / Edit dialog */}
      <InvestmentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        investment={editTarget}
        onSuccess={() => {
          handleDialogClose(false);
          fetchInvestments();
        }}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{deleteTarget?.name}</strong> from your portfolio. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
