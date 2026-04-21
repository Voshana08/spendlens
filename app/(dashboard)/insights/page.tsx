"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  Trophy,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type InsightType = "warning" | "tip" | "achievement";

type Insight = {
  title: string;
  description: string;
  type: InsightType;
};

type HistoryEntry = {
  id: number;
  question: string;
  answer: string;
  timestamp: Date;
};

// ── Insight card config ───────────────────────────────────────────────────────

const INSIGHT_CONFIG: Record<
  InsightType,
  { icon: React.ElementType; bg: string; iconColor: string; border: string }
> = {
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-500",
    border: "border-amber-200 dark:border-amber-800",
  },
  tip: {
    icon: Lightbulb,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-500",
    border: "border-blue-200 dark:border-blue-800",
  },
  achievement: {
    icon: Trophy,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-500",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRateLimit(status: number) {
  return status === 429;
}

// ── Insight cards ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const config = INSIGHT_CONFIG[insight.type];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        config.bg,
        config.border
      )}
    >
      <div className="shrink-0 mt-0.5">
        <Icon className={cn("size-5", config.iconColor)} />
      </div>
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-sm leading-snug">{insight.title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {insight.description}
        </p>
      </div>
    </div>
  );
}

function InsightCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border p-4 bg-muted/30">
      <Skeleton className="size-5 shrink-0 mt-0.5 rounded-full" />
      <div className="space-y-2 flex-1 min-w-0">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

// ── History entry ─────────────────────────────────────────────────────────────

function HistoryEntryCard({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-2 min-w-0">
          <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-sm font-medium truncate">{entry.question}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {entry.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {expanded ? (
            <ChevronUp className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <Separator className="mb-3" />
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {entry.answer}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  // ── Insights state ──────────────────────────────────────────────────────────
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // ── Query state ─────────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveAnswer, setLiveAnswer] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const streamBoxRef = useRef<HTMLDivElement>(null);

  // ── Fetch insights ──────────────────────────────────────────────────────────
  const fetchInsights = useCallback(async (isRegenerate = false) => {
    if (isRegenerate) setRegenerating(true);
    else setInsightsLoading(true);

    try {
      const res = await fetch("/api/ai/insights");

      if (isRateLimit(res.status)) {
        toast.error("Rate limit reached. Please wait a moment before regenerating.");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to load insights. Please try again.");
        return;
      }

      const data: Insight[] = await res.json();
      setInsights(data);
    } catch {
      toast.error("Could not reach the AI service. Check your connection.");
    } finally {
      setInsightsLoading(false);
      setRegenerating(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Stream answer ───────────────────────────────────────────────────────────
  const handleAsk = async () => {
    const q = question.trim();
    if (!q || streaming) return;

    // Cancel any in-progress stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setLiveAnswer("");

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });

      if (isRateLimit(res.status)) {
        toast.error("Rate limit reached. Please wait before asking another question.");
        setStreaming(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to get an answer. Please try again.");
        setStreaming(false);
        return;
      }

      if (!res.body) {
        toast.error("Streaming not supported in this environment.");
        setStreaming(false);
        return;
      }

      // Consume the stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";

      setQuestion("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullAnswer += chunk;
        setLiveAnswer(fullAnswer);

        // Scroll to bottom of stream box
        if (streamBoxRef.current) {
          streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
        }
      }

      // Move completed answer into history
      setHistory((prev) => [
        {
          id: nextId.current++,
          question: q,
          answer: fullAnswer,
          timestamp: new Date(),
        },
        ...prev,
      ]);
      setLiveAnswer("");
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // user navigated away
      toast.error("Connection lost while streaming. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter submits
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAsk();
    }
  };

  const charsLeft = 500 - question.length;

  return (
    <div className="space-y-10">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
        <p className="text-muted-foreground">
          Personalised analysis of your spending, and answers to your financial
          questions.
        </p>
      </div>

      {/* ── Section 1: Insights ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Spending Insights</h2>
            <p className="text-sm text-muted-foreground">
              Based on your last 3 months of transactions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInsights(true)}
            disabled={insightsLoading || regenerating}
          >
            <RefreshCw
              className={cn("mr-2 size-3.5", regenerating && "animate-spin")}
            />
            Regenerate
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {insightsLoading ? (
            <>
              <InsightCardSkeleton />
              <InsightCardSkeleton />
              <InsightCardSkeleton />
              <InsightCardSkeleton />
            </>
          ) : insights.length === 0 ? (
            <div className="sm:col-span-2 flex items-center justify-center rounded-xl border border-dashed py-12 text-sm text-muted-foreground">
              No insights available. Add more transactions and try again.
            </div>
          ) : (
            insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))
          )}
        </div>
      </section>

      <Separator />

      {/* ── Section 2: Ask a question ───────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Ask a Question</h2>
          <p className="text-sm text-muted-foreground">
            Ask anything about your transactions. Claude has access to your last
            12 months of data.
          </p>
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              placeholder="e.g. How much did I spend on food last month? What was my biggest expense in March?"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-14"
            />
            {/* Char counter */}
            <span
              className={cn(
                "absolute bottom-2.5 right-3 text-xs tabular-nums",
                charsLeft <= 50
                  ? "text-amber-500"
                  : charsLeft <= 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {charsLeft}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              ⌘ Enter to submit
            </p>
            <Button
              onClick={handleAsk}
              disabled={!question.trim() || streaming || question.length > 500}
              size="sm"
            >
              {streaming ? (
                <>
                  <RefreshCw className="mr-2 size-3.5 animate-spin" />
                  Answering…
                </>
              ) : (
                <>
                  <Send className="mr-2 size-3.5" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live stream box */}
        {streaming && liveAnswer && (
          <div
            ref={streamBoxRef}
            className="max-h-60 overflow-y-auto rounded-xl border bg-muted/30 px-4 py-3"
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {liveAnswer}
              <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-foreground align-middle animate-pulse" />
            </p>
          </div>
        )}

        {/* Session history */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                This session
              </span>
            </div>
            <div className="space-y-2">
              {history.map((entry) => (
                <HistoryEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
