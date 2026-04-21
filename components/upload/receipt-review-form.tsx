"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import type { ReceiptPreview } from "./types";

type Category = { id: string; name: string; icon: string };

interface ReceiptReviewFormProps {
  uploadId: string;
  preview: ReceiptPreview;
  onCancel: () => void;
  onConfirmed: () => void;
}

export function ReceiptReviewForm({
  uploadId,
  preview,
  onCancel,
  onConfirmed,
}: ReceiptReviewFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    description: preview.description,
    amount: String(preview.amount),
    date: preview.date,
    categoryId: preview.categoryId,
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/uploads/${uploadId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactions: [
          {
            description: form.description,
            amount,
            type: "EXPENSE",
            date: `${form.date}T00:00:00.000Z`,
            categoryId: form.categoryId,
            isRecurring: false,
            recurrenceInterval: null,
          },
        ],
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Transaction saved from receipt");
      onConfirmed();
      router.push("/transactions");
    } else {
      toast.error("Failed to save transaction");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review Receipt</h2>
        <p className="text-sm text-muted-foreground">
          AI extracted the details below. Edit anything before saving.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Merchant / description */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="r-description">Merchant / Description</Label>
          <Input
            id="r-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="r-amount">Amount (AUD)</Label>
          <Input
            id="r-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="r-date">Date</Label>
          <Input
            id="r-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Category</Label>
          <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Line items (read-only) */}
      {preview.items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Line items (read-only)
          </p>
          <Separator />
          <div className="space-y-1">
            {preview.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.description}</span>
                <span className="tabular-nums">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} className="flex-1">
          {loading ? "Saving…" : "Save transaction"}
        </Button>
      </div>
    </div>
  );
}
