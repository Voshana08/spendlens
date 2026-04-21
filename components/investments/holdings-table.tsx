"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercentage } from "@/lib/format";
import type { Investment } from "./types";
import { holdingCost, holdingValue, holdingPnL, holdingPnLPct } from "./types";
import { TYPE_COLORS, TYPE_LABELS } from "./allocation-charts";

interface HoldingsTableProps {
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
}

function PnLCell({ value, pct }: { value: number; pct: number }) {
  const cls =
    value > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : value < 0
      ? "text-red-500"
      : "text-muted-foreground";
  return (
    <div className={cls}>
      <p className="tabular-nums font-medium">
        {value >= 0 ? "+" : ""}
        {formatCurrency(value)}
      </p>
      <p className="text-xs tabular-nums">
        {formatPercentage(pct, true)}
      </p>
    </div>
  );
}

export function HoldingsTable({
  investments,
  onEdit,
  onDelete,
}: HoldingsTableProps) {
  if (investments.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed py-16 text-sm text-muted-foreground">
        No investments yet. Add your first holding above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px]">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Buy Price</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">P&amp;L</TableHead>
            <TableHead className="text-right">Purchased</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map((inv) => {
            const cost = holdingCost(inv);
            const value = holdingValue(inv);
            const pnl = holdingPnL(inv);
            const pnlPct = holdingPnLPct(inv);
            const qty = Number(inv.quantity);

            return (
              <TableRow key={inv.id}>
                {/* Name */}
                <TableCell>
                  <p className="font-medium">{inv.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Cost: {formatCurrency(cost)}
                  </p>
                </TableCell>

                {/* Type badge */}
                <TableCell>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: `${TYPE_COLORS[inv.type]}18`,
                      color: TYPE_COLORS[inv.type],
                      borderColor: `${TYPE_COLORS[inv.type]}40`,
                    }}
                  >
                    {TYPE_LABELS[inv.type]}
                  </Badge>
                </TableCell>

                {/* Quantity */}
                <TableCell className="text-right tabular-nums text-sm">
                  {qty % 1 === 0 ? qty.toLocaleString() : qty.toFixed(4)}
                </TableCell>

                {/* Buy Price */}
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(Number(inv.buyPrice))}
                </TableCell>

                {/* Current Price */}
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(Number(inv.currentValue))}
                </TableCell>

                {/* Value */}
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {formatCurrency(value)}
                </TableCell>

                {/* P&L */}
                <TableCell className="text-right">
                  <PnLCell value={pnl} pct={pnlPct} />
                </TableCell>

                {/* Purchase date */}
                <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(inv.purchaseDate)}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onEdit(inv)}
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(inv)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
