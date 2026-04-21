"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UploadDropzone } from "./upload-dropzone";
import { ReceiptReviewForm } from "./receipt-review-form";
import { StatementReviewTable } from "./statement-review-table";
import { UploadHistory } from "./upload-history";
import type { ParseResult } from "./types";

type PageState =
  | { kind: "idle" }
  | { kind: "review"; result: ParseResult };

export function UploadPageClient() {
  const [pageState, setPageState] = useState<PageState>({ kind: "idle" });
  // Increment to trigger history refetch after a successful upload
  const [historyKey, setHistoryKey] = useState(0);

  const handleParseComplete = (result: ParseResult) => {
    setHistoryKey((k) => k + 1); // upload record now exists
    setPageState({ kind: "review", result });
  };

  const handleCancel = () => {
    setPageState({ kind: "idle" });
  };

  const handleConfirmed = () => {
    setHistoryKey((k) => k + 1);
    setPageState({ kind: "idle" });
  };

  return (
    <div className="space-y-8">
      {/* Upload / Review card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          {pageState.kind === "idle" && (
            <UploadDropzone onParseComplete={handleParseComplete} />
          )}

          {pageState.kind === "review" && pageState.result.type === "RECEIPT" && (
            <ReceiptReviewForm
              uploadId={pageState.result.uploadId}
              preview={pageState.result.preview}
              onCancel={handleCancel}
              onConfirmed={handleConfirmed}
            />
          )}

          {pageState.kind === "review" && pageState.result.type === "BANK_STATEMENT" && (
            <StatementReviewTable
              uploadId={pageState.result.uploadId}
              previews={pageState.result.previews}
              onCancel={handleCancel}
              onConfirmed={handleConfirmed}
            />
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Upload History</h2>
          <p className="text-sm text-muted-foreground">
            Click a completed upload to re-view or re-save its transactions.
          </p>
        </div>
        <Separator />
        <UploadHistory refreshKey={historyKey} />
      </div>
    </div>
  );
}
