"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CategoryFormDialog, type CategoryRow } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

export function CategoriesSection() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (cat: CategoryRow) => {
    setSelectedCategory(cat);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (cat: CategoryRow) => {
    setCategoryToDelete({ id: cat.id, name: cat.name });
    setIsDeleteOpen(true);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Organise your transactions and budgets with custom categories.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Plus />
          Add Category
        </Button>
      </div>

      <Separator />

      <div className="rounded-lg border divide-y">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-5 w-16" />
            </div>
          ))
        ) : categories.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No categories yet.
          </p>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Color + icon */}
              <div
                className="flex size-8 items-center justify-center rounded-full text-base shrink-0"
                style={{ backgroundColor: cat.color + "33" }}
              >
                {cat.icon}
              </div>

              {/* Name */}
              <span className="flex-1 font-medium">{cat.name}</span>

              {/* Color swatch */}
              <span
                className="size-3.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
                title={cat.color}
              />

              {/* Default badge */}
              {cat.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(cat)}
                  aria-label={`Edit ${cat.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={cat.isDefault}
                  onClick={() => handleDeleteRequest(cat)}
                  aria-label={`Delete ${cat.name}`}
                  className="text-destructive hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
        onSuccess={() => {
          refresh();
          setIsFormOpen(false);
          setSelectedCategory(null);
        }}
      />

      <DeleteCategoryDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        category={categoryToDelete}
        onSuccess={() => {
          refresh();
          setIsDeleteOpen(false);
          setCategoryToDelete(null);
        }}
      />
    </section>
  );
}
