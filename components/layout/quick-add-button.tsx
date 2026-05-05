"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { QuickAddSheet } from "./quick-add-sheet";

export function QuickAddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Only visible on mobile (<768px) */}
      <button
        type="button"
        aria-label="Quick add transaction"
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6 z-30
          flex h-14 w-14 items-center justify-center
          rounded-full bg-primary text-primary-foreground
          shadow-lg shadow-black/20
          transition-transform active:scale-95
        "
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>

      <QuickAddSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
