import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BudgetItem {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  budget: number;
  percentage: number;
}

interface BudgetProgressListProps {
  budgets: BudgetItem[];
}

export function BudgetProgressList({ budgets }: BudgetProgressListProps) {
  if (budgets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No budgets set for this month.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((b) => {
        const isOver = b.percentage >= 100;
        const barPct = Math.min(b.percentage, 100);

        return (
          <div key={b.categoryId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span>{b.icon}</span>
                {b.name}
              </span>
              <span
                className={cn(
                  "tabular-nums text-xs",
                  isOver
                    ? "text-red-500 dark:text-red-400 font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isOver ? "bg-red-500" : "bg-primary"
                )}
                style={{ width: `${barPct}%` }}
              />
            </div>

            <p
              className={cn(
                "text-right text-xs tabular-nums",
                isOver
                  ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {isOver
                ? `${b.percentage}% — over budget`
                : `${b.percentage}% used`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
