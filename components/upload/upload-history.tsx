"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptReviewForm } from "./receipt-review-form";
import { StatementReviewTable } from "./statement-review-table";
import type { UploadHistoryItem, ReceiptPreview, StatementPreview } from "./types";

type DetailState =
  | { kind: "none" }
  | { kind: "loading"; uploadId: string }
  | { kind: "receipt"; uploadId: string; preview: ReceiptPreview }
  | { kind: "statement"; uploadId: string; previews: StatementPreview[] }
  | { kind: "error" };

export function UploadHistory({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<UploadHistoryItem[]>([]);
  const [fetchingList, setFetchingList] = useState(true);
  const [detail, setDetail] = useState<DetailState>({ kind: "none" });

  useEffect(() => {
    setFetchingList(true);
    fetch("/api/uploads")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setFetchingList(false));
  }, [refreshKey]);

  const openDetail = async (item: UploadHistoryItem) => {
    if (item.status !== "COMPLETED") return;

    setDetail({ kind: "loading", uploadId: item.id });

    const res = await fetch(`/api/uploads/${item.id}`);
    if (!res.ok) {
      setDetail({ kind: "error" });
      return;
    }

    const upload = await res.json();
    const parsed = upload.parsedData;

    if (!parsed) {
      setDetail({ kind: "error" });
      return;
    }

    if (item.fileType === "RECEIPT") {
      setDetail({ kind: "receipt", uploadId: item.id, preview: parsed });
    } else {
      setDetail({
        kind: "statement",
        uploadId: item.id,
        previews: Array.isArray(parsed) ? parsed : parsed.previews ?? [],
      });
    }
  };

  const closeDetail = () => setDetail({ kind: "none" });

  if (fetchingList) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No uploads yet. Drop a PDF above to get started.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-[200px] truncate font-medium text-sm">
                  {item.fileName}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {item.fileType === "RECEIPT" ? "🧾 Receipt" : "🏦 Statement"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(new Date(item.createdAt))}
                </TableCell>
                <TableCell>
                  {item.status === "COMPLETED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(item)}
                      disabled={detail.kind === "loading"}
                    >
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={detail.kind !== "none"} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail.kind === "receipt"
                ? "Receipt Details"
                : detail.kind === "statement"
                ? "Statement Details"
                : "Loading…"}
            </DialogTitle>
          </DialogHeader>

          {detail.kind === "loading" && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          )}

          {detail.kind === "error" && (
            <p className="text-sm text-destructive py-4">
              Could not load parsed data for this upload.
            </p>
          )}

          {detail.kind === "receipt" && (
            <ReceiptReviewForm
              uploadId={detail.uploadId}
              preview={detail.preview}
              onCancel={closeDetail}
              onConfirmed={closeDetail}
            />
          )}

          {detail.kind === "statement" && (
            <StatementReviewTable
              uploadId={detail.uploadId}
              previews={detail.previews}
              onCancel={closeDetail}
              onConfirmed={closeDetail}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ status }: { status: UploadHistoryItem["status"] }) {
  if (status === "COMPLETED")
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 text-xs border-0">
        Completed
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge variant="destructive" className="text-xs">
        Failed
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      Processing
    </Badge>
  );
}
