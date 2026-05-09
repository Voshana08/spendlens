import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Grade = "A+" | "A" | "B" | "C" | "D" | "F";

interface ComponentScore {
  score: number;
  maxScore: number;
  details: string;
}

export interface HealthScoreData {
  totalScore: number;
  grade: Grade;
  components: {
    savingsRate: ComponentScore;
    budgetAdherence: ComponentScore;
    incomeStability: ComponentScore;
    spendingDiversity: ComponentScore;
  };
  tips: string[];
}

const INDICATORS = [
  { key: "savingsRate",       label: "Sav" },
  { key: "budgetAdherence",   label: "Bud" },
  { key: "incomeStability",   label: "Inc" },
  { key: "spendingDiversity", label: "Div" },
] as const;

function scoreTextColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function scoreBarColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-500";
}

function dotColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.8) return "bg-emerald-500";
  if (pct >= 0.5) return "bg-amber-400";
  return "bg-red-500";
}

function gradeBadgeClass(grade: Grade) {
  if (grade === "A+" || grade === "A")
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  if (grade === "B")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
  if (grade === "C")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}

export function HealthScoreCard({ totalScore, grade, components }: HealthScoreData) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Financial health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score + grade badge */}
        <div className="flex items-end gap-2">
          <p className={cn("text-2xl font-bold tabular-nums", scoreTextColor(totalScore))}>
            {totalScore}
          </p>
          <p className="mb-0.5 text-xs text-muted-foreground">/100</p>
          <span
            className={cn(
              "ml-auto rounded-md px-2 py-0.5 text-xs font-semibold",
              gradeBadgeClass(grade)
            )}
          >
            {grade}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", scoreBarColor(totalScore))}
            style={{ width: `${totalScore}%` }}
          />
        </div>

        {/* Per-component dots */}
        <div className="flex items-center justify-between pt-0.5">
          {INDICATORS.map(({ key, label }) => {
            const c = components[key];
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-1"
                title={`${label}: ${c.score}/${c.maxScore} — ${c.details}`}
              >
                <span className={cn("size-2 rounded-full", dotColor(c.score, c.maxScore))} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
