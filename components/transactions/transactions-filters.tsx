"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Category = { id: string; name: string; icon: string };

export function TransactionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStartDate = (date: Date | undefined) => {
    setStartDate(date);
    updateParam("startDate", date ? date.toISOString() : null);
  };

  const handleEndDate = (date: Date | undefined) => {
    setEndDate(date);
    updateParam("endDate", date ? date.toISOString() : null);
  };

  const clearAll = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    router.push(pathname);
  };

  const hasFilters =
    searchParams.get("type") ||
    searchParams.get("categoryId") ||
    searchParams.get("startDate") ||
    searchParams.get("endDate");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type */}
      <Select
        value={searchParams.get("type") ?? "ALL"}
        onValueChange={(v) => updateParam("type", v === "ALL" ? null : v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All types</SelectItem>
          <SelectItem value="INCOME">Income</SelectItem>
          <SelectItem value="EXPENSE">Expense</SelectItem>
        </SelectContent>
      </Select>

      {/* Category */}
      <Select
        value={searchParams.get("categoryId") ?? "ALL"}
        onValueChange={(v) => updateParam("categoryId", v === "ALL" ? null : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.icon} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Start date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-40 justify-start font-normal">
            <CalendarIcon className="mr-2 size-4" />
            {startDate ? format(startDate, "dd MMM yyyy") : "From date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleStartDate}
            disabled={endDate ? { after: endDate } : undefined}
          />
        </PopoverContent>
      </Popover>

      {/* End date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-40 justify-start font-normal">
            <CalendarIcon className="mr-2 size-4" />
            {endDate ? format(endDate, "dd MMM yyyy") : "To date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={handleEndDate}
            disabled={startDate ? { before: startDate } : undefined}
          />
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="mr-1 size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
