"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ── Category cache (module-level so it survives re-renders) ───────────────────

let cachedCategories: Category[] | null = null;

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickAddSheet({ open, onOpenChange }: Props) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  // Fetch categories once and cache them
  useEffect(() => {
    if (cachedCategories) {
      setCategories(cachedCategories);
      return;
    }
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => {
        cachedCategories = data;
        setCategories(data);
      })
      .catch(() => {});
  }, []);

  // Auto-focus amount when sheet opens; reset state
  useEffect(() => {
    if (open) {
      setAmount("");
      setType("EXPENSE");
      setCategoryId(null);
      setDescription("");
      setSaved(false);
      // Small delay to let the drawer animate in first
      setTimeout(() => amountRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          type,
          categoryId,
          description: description.trim() || "Quick add",
          date: new Date().toISOString(),
          isRecurring: false,
        }),
      });

      if (!res.ok) throw new Error();

      // Haptic feedback if supported
      if ("vibrate" in navigator) navigator.vibrate(50);

      // Show checkmark briefly, then close
      setSaved(true);
      toast.success("Transaction saved");
      setTimeout(() => onOpenChange(false), 600);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-background outline-none">
          {/* Drag handle */}
          <div className="mx-auto mt-3 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />

          <Drawer.Title className="sr-only">Quick add transaction</Drawer.Title>

          <div className="flex flex-col gap-5 px-5 pb-8 pt-3 overflow-y-auto max-h-[85vh]">

            {/* ── Amount ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-light text-muted-foreground">$</span>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  // Allow digits and at most one decimal point
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = val.split(".");
                  if (parts.length <= 2) setAmount(val);
                }}
                className="w-44 bg-transparent text-center text-5xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40 caret-primary"
              />
            </div>

            {/* ── Type toggle ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={cn(
                  "rounded-lg py-2.5 text-sm font-semibold transition-all",
                  type === "EXPENSE"
                    ? "bg-background text-red-500 shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={cn(
                  "rounded-lg py-2.5 text-sm font-semibold transition-all",
                  type === "INCOME"
                    ? "bg-background text-emerald-500 shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Income
              </button>
            </div>

            {/* ── Category grid ───────────────────────────────────────────── */}
            {categories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Category
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl p-2 transition-all",
                        categoryId === cat.id
                          ? "outline outline-2 outline-offset-1"
                          : "bg-muted/60 hover:bg-muted"
                      )}
                      style={
                        categoryId === cat.id
                          ? { backgroundColor: cat.color + "20", outlineColor: cat.color }
                          : undefined
                      }
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                        style={{ backgroundColor: cat.color + "25" }}
                      >
                        {cat.icon}
                      </span>
                      <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Description ─────────────────────────────────────────────── */}
            <Input
              placeholder="Note (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              className="h-10 text-sm"
            />

            {/* ── Save button ─────────────────────────────────────────────── */}
            <Button
              onClick={handleSave}
              disabled={saving || saved}
              size="lg"
              className={cn(
                "w-full text-base font-semibold transition-all",
                saved && "bg-emerald-500 hover:bg-emerald-500"
              )}
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <Check className="size-5" />
                  Saved!
                </span>
              ) : saving ? (
                "Saving…"
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
