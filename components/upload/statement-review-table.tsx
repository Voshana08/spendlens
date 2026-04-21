"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StatementPreview } from "./types";

type Category = { id: string; name: string; icon: string };

interface Row extends StatementPreview {
  included: boolean;
  _localId: number;
}

interface StatementReviewTableProps {
  uploadId: string;
  previews: StatementPreview[];
  onCancel: () => void;
  onConfirmed: () => void;
}

export function StatementReviewTable({
  uploadId,
  previews,
  onCancel,
  onConfirmed,
}: StatementReviewTableProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    previews.map((p, i) => ({ ...p, included: true, _localId: i }))
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const updateRow = <K extends keyof Row>(localId: number, key: K, value: Row[K]) =>
    setRows((prev) =>
      prev.map((r) => (r._localId === localId ? { ...r, [key]: value } : r))
    );

  const allChecked = rows.every((r) => r.included);
  const toggleAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, included: !allChecked })));

  const includedCount = rows.filter((r) => r.included).length;

  const handleSave = async () => {
    const selected = rows.filter((r) => r.included);
    if (selected.length === 0) {
      toast.error("Select at least one transaction to save");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/uploads/${uploadId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactions: selected.map((r) => ({
          description: r.description,
          amount: Number(r.amount),
          type: r.type,
          date: `${r.date}T00:00:00.000Z`,
          categoryId: r.categoryId,
          isRecurring: false,
          recurrenceInterval: null,
        })),
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success(`${selected.length} transaction${selected.length !== 1 ? "s" : ""} saved`);
      onConfirmed();
      router.push("/transactions");
    } else {
      toast.error("Failed to save transactions");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Review Statement</h2>
        <p className="text-sm text-muted-foreground">
          AI extracted {rows.length} transaction{rows.length !== 1 ? "s" : ""}. Uncheck any you
          want to skip, then edit details as needed.
        </p>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="min-w-[180px]">Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-28">Amount</TableHead>
              <TableHead className="min-w-[160px]">Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row._localId}
                className={!row.included ? "opacity-40" : undefined}
              >
                {/* Checkbox */}
                <TableCell>
                  <Checkbox
                    checked={row.included}
                    onCheckedChange={(v) => updateRow(row._localId, "included", Boolean(v))}
                    aria-label="Include row"
                  />
                </TableCell>

                {/* Date */}
                <TableCell>
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row._localId, "date", e.target.value)}
                    className="h-8 w-36 text-sm"
                    disabled={!row.included}
                  />
                </TableCell>

                {/* Description */}
                <TableCell>
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(row._localId, "description", e.target.value)}
                    className="h-8 text-sm"
                    disabled={!row.included}
                  />
                </TableCell>

                {/* Type badge */}
                <TableCell>
                  <Badge
                    variant={row.type === "INCOME" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {row.type === "INCOME" ? "Income" : "Expense"}
                  </Badge>
                </TableCell>

                {/* Amount */}
                <TableCell>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={String(row.amount)}
                    onChange={(e) =>
                      updateRow(row._localId, "amount", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-24 text-sm tabular-nums"
                    disabled={!row.included}
                  />
                </TableCell>

                {/* Category */}
                <TableCell>
                  <Select
                    value={row.categoryId}
                    onValueChange={(v) => updateRow(row._localId, "categoryId", v)}
                    disabled={!row.included}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {includedCount} of {rows.length} selected
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || includedCount === 0}>
            {loading ? "Saving…" : `Save ${includedCount} transaction${includedCount !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
