"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Investment, InvestmentType } from "./types";
import { holdingValue } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<InvestmentType, string> = {
  STOCK: "#3B82F6",
  CRYPTO: "#F59E0B",
  ETF: "#10B981",
  BOND: "#8B5CF6",
  PROPERTY: "#EF4444",
  OTHER: "#6B7280",
};

export const TYPE_LABELS: Record<InvestmentType, string> = {
  STOCK: "Stock",
  CRYPTO: "Crypto",
  ETF: "ETF",
  BOND: "Bond",
  PROPERTY: "Property",
  OTHER: "Other",
};

// Cycles for the by-holding chart
const PALETTE = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6B7280",
];

// ── Tooltip ───────────────────────────────────────────────────────────────────

type Slice = { name: string; value: number; color: string; percentage: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Slice }>;
}) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{s.name}</p>
      <p className="text-muted-foreground">
        {formatCurrency(s.value)} · {s.percentage}%
      </p>
    </div>
  );
}

// ── Inner donut chart ─────────────────────────────────────────────────────────

function DonutChart({
  data,
  emptyText,
}: {
  data: Slice[];
  emptyText: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            nameKey="name"
            paddingAngle={2}
          >
            {data.map((slice, i) => (
              <Cell key={i} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.slice(0, 8).map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate text-muted-foreground">{slice.name}</span>
            <span className="ml-auto shrink-0 tabular-nums font-medium">
              {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exported component ────────────────────────────────────────────────────────

export function AllocationCharts({ investments }: { investments: Investment[] }) {
  const total = investments.reduce((sum, inv) => sum + holdingValue(inv), 0);

  // By type
  const typeMap = new Map<InvestmentType, number>();
  for (const inv of investments) {
    typeMap.set(inv.type, (typeMap.get(inv.type) ?? 0) + holdingValue(inv));
  }
  const byType: Slice[] = Array.from(typeMap.entries()).map(([type, value]) => ({
    name: TYPE_LABELS[type],
    value,
    color: TYPE_COLORS[type],
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
  }));

  // By holding
  const byHolding: Slice[] = investments.map((inv, i) => ({
    name: inv.name,
    value: holdingValue(inv),
    color: PALETTE[i % PALETTE.length],
    percentage: total > 0 ? Math.round((holdingValue(inv) / total) * 100) : 0,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Allocation by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={byType} emptyText="No investments yet" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Allocation by Holding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={byHolding} emptyText="No investments yet" />
        </CardContent>
      </Card>
    </div>
  );
}
