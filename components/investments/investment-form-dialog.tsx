"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Investment, InvestmentType } from "./types";

const INVESTMENT_TYPES: InvestmentType[] = [
  "STOCK", "CRYPTO", "ETF", "BOND", "PROPERTY", "OTHER",
];

export const TYPE_LABELS: Record<InvestmentType, string> = {
  STOCK: "Stock",
  CRYPTO: "Crypto",
  ETF: "ETF",
  BOND: "Bond",
  PROPERTY: "Property",
  OTHER: "Other",
};

const defaultForm = {
  name: "",
  type: "STOCK" as InvestmentType,
  buyPrice: "",
  quantity: "",
  currentValue: "",
  purchaseDate: new Date(),
  notes: "",
};

type FormErrors = Partial<Record<string, string>>;

interface InvestmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  onSuccess: () => void;
}

export function InvestmentFormDialog({
  open,
  onOpenChange,
  investment,
  onSuccess,
}: InvestmentFormDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const isEditing = !!investment;

  useEffect(() => {
    if (!open) return;
    if (investment) {
      setForm({
        name: investment.name,
        type: investment.type,
        buyPrice: Number(investment.buyPrice).toString(),
        quantity: Number(investment.quantity).toString(),
        currentValue: Number(investment.currentValue).toString(),
        purchaseDate: new Date(investment.purchaseDate),
        notes: investment.notes ?? "",
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [open, investment]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Name is required";
    const bp = parseFloat(form.buyPrice);
    if (isNaN(bp) || bp <= 0) errs.buyPrice = "Must be a positive number";
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) errs.quantity = "Must be a positive number";
    const cv = parseFloat(form.currentValue);
    if (isNaN(cv) || cv < 0) errs.currentValue = "Must be zero or more";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    const body = {
      name: form.name.trim(),
      type: form.type,
      buyPrice: parseFloat(form.buyPrice),
      quantity: parseFloat(form.quantity),
      currentValue: parseFloat(form.currentValue),
      purchaseDate: form.purchaseDate.toISOString(),
      notes: form.notes.trim() || null,
    };

    const res = await fetch(
      isEditing ? `/api/investments/${investment.id}` : "/api/investments",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setLoading(false);

    if (res.ok || res.status === 201) {
      toast.success(isEditing ? "Investment updated" : "Investment added");
      onSuccess();
    } else {
      toast.error("Failed to save investment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit investment" : "Add investment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Name</Label>
            <Input
              id="inv-name"
              placeholder="e.g. Apple Inc."
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => set("type", v as InvestmentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Buy Price + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-buy">Buy Price (AUD)</Label>
              <Input
                id="inv-buy"
                type="number"
                min="0.00001"
                step="any"
                placeholder="0.00"
                value={form.buyPrice}
                onChange={(e) => set("buyPrice", e.target.value)}
                aria-invalid={!!errors.buyPrice}
              />
              {errors.buyPrice && (
                <p className="text-xs text-destructive">{errors.buyPrice}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-qty">Quantity</Label>
              <Input
                id="inv-qty"
                type="number"
                min="0.00001"
                step="any"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                aria-invalid={!!errors.quantity}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* Current Price */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-cur">Current Price (AUD)</Label>
            <Input
              id="inv-cur"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={form.currentValue}
              onChange={(e) => set("currentValue", e.target.value)}
              aria-invalid={!!errors.currentValue}
            />
            {errors.currentValue && (
              <p className="text-xs text-destructive">{errors.currentValue}</p>
            )}
          </div>

          {/* Purchase Date */}
          <div className="space-y-1.5">
            <Label>Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {format(form.purchaseDate, "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.purchaseDate}
                  onSelect={(d) => d && set("purchaseDate", d)}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Notes (optional)</Label>
            <textarea
              id="inv-notes"
              rows={3}
              placeholder="Any notes about this investment…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isEditing
                  ? "Saving…"
                  : "Adding…"
                : isEditing
                ? "Save changes"
                : "Add investment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
