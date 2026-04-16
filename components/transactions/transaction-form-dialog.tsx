"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Category = { id: string; name: string; icon: string; color: string };

type Transaction = {
  id: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  date: string;
  isRecurring: boolean;
  recurrenceInterval: "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  categoryId: string;
};

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onSuccess: () => void;
}

const formSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine(
        (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
        "Must be a positive number"
      ),
    categoryId: z.string().min(1, "Please select a category"),
    description: z.string().min(1, "Description is required"),
    date: z.date(),
    isRecurring: z.boolean(),
    recurrenceInterval: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).nullable().optional(),
  })
  .refine((d) => !d.isRecurring || d.recurrenceInterval != null, {
    message: "Please select an interval",
    path: ["recurrenceInterval"],
  });

type FormErrors = Partial<Record<keyof z.infer<typeof formSchema>, string>>;

const defaultForm = {
  type: "EXPENSE" as "INCOME" | "EXPENSE",
  amount: "",
  categoryId: "",
  description: "",
  date: new Date(),
  isRecurring: false,
  recurrenceInterval: null as null | "WEEKLY" | "MONTHLY" | "YEARLY",
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionFormDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const isEditing = !!transaction;

  // Populate form when dialog opens
  useEffect(() => {
    if (!open) return;

    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});

    if (transaction) {
      setForm({
        type: transaction.type,
        amount: parseFloat(transaction.amount).toString(),
        categoryId: transaction.categoryId,
        description: transaction.description,
        date: new Date(transaction.date),
        isRecurring: transaction.isRecurring,
        recurrenceInterval: transaction.recurrenceInterval,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [open, transaction]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const body = {
      type: result.data.type,
      amount: parseFloat(result.data.amount),
      categoryId: result.data.categoryId,
      description: result.data.description,
      date: result.data.date.toISOString(),
      isRecurring: result.data.isRecurring,
      recurrenceInterval: result.data.isRecurring
        ? result.data.recurrenceInterval
        : null,
    };

    const res = await fetch(
      isEditing ? `/api/transactions/${transaction.id}` : "/api/transactions",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    setLoading(false);

    if (res.ok) {
      toast.success(isEditing ? "Transaction updated" : "Transaction added");
      onSuccess();
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-2">
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={form.type === t ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => set("type", t)}
                >
                  {t === "INCOME" ? "💰 Income" : "💸 Expense"}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (AUD)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {format(form.date, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.date}
                  onSelect={(d) => d && set("date", d)}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => set("categoryId", v)}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={!!errors.categoryId}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Grocery run at Coles"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Recurring */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isRecurring"
                checked={form.isRecurring}
                onCheckedChange={(v) => {
                  set("isRecurring", v === true);
                  if (v !== true) set("recurrenceInterval", null);
                }}
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">
                Recurring transaction
              </Label>
            </div>

            {form.isRecurring && (
              <div className="space-y-1.5 pl-6">
                <Label>Repeats</Label>
                <Select
                  value={form.recurrenceInterval ?? ""}
                  onValueChange={(v) =>
                    set(
                      "recurrenceInterval",
                      v as "WEEKLY" | "MONTHLY" | "YEARLY"
                    )
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.recurrenceInterval}
                  >
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.recurrenceInterval && (
                  <p className="text-xs text-destructive">
                    {errors.recurrenceInterval}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isEditing
                  ? "Saving…"
                  : "Adding…"
                : isEditing
                ? "Save changes"
                : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
