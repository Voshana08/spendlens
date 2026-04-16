"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#F97316", "#EAB308", "#22C55E", "#10B981",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
  "#EF4444", "#14B8A6", "#F59E0B", "#6B7280",
];

export type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
};

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRow | null;
  onSuccess: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  icon: z.string().min(1, "Icon is required"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex colour"),
});

type FormErrors = Partial<Record<keyof z.infer<typeof formSchema>, string>>;

const defaultForm = { name: "", icon: "", color: "#6B7280" };

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const isEditing = !!category;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (category) {
      setForm({ name: category.name, icon: category.icon, color: category.color });
    } else {
      setForm(defaultForm);
    }
  }, [open, category]);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
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
    const res = await fetch(
      isEditing ? `/api/categories/${category.id}` : "/api/categories",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      }
    );
    setLoading(false);

    if (res.ok) {
      toast.success(isEditing ? "Category updated" : "Category created");
      onSuccess();
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Groceries"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Icon */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">Icon (emoji)</Label>
            <Input
              id="cat-icon"
              placeholder="e.g. 🍔  🚗  💡  🛍️"
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
              aria-invalid={!!errors.icon}
            />
            {errors.icon && (
              <p className="text-xs text-destructive">{errors.icon}</p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Colour</Label>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform hover:scale-110",
                    form.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            {/* Custom color + hex display */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
                aria-label="Custom colour"
              />
              <span className="font-mono text-sm text-muted-foreground">
                {form.color.toUpperCase()}
              </span>
            </div>
            {errors.color && (
              <p className="text-xs text-destructive">{errors.color}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isEditing ? "Saving…" : "Creating…"
                : isEditing ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
