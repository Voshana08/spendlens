"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadIcon, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParseResult, UploadType } from "./types";

interface UploadDropzoneProps {
  onParseComplete: (result: ParseResult) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "parsing" }
  | { kind: "error"; message: string };

export function UploadDropzone({ onParseComplete }: UploadDropzoneProps) {
  const [uploadType, setUploadType] = useState<UploadType>("RECEIPT");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // ── Step 1: Upload ───────────────────────────────────────────────────────
      setStatus({ kind: "uploading" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        setStatus({
          kind: "error",
          message: data.error ?? "Upload failed. Please try again.",
        });
        return;
      }

      const upload = await uploadRes.json();

      // ── Step 2: Parse ────────────────────────────────────────────────────────
      setStatus({ kind: "parsing" });

      const parseEndpoint =
        uploadType === "RECEIPT"
          ? "/api/ai/parse-receipt"
          : "/api/ai/parse-statement";

      const parseRes = await fetch(parseEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: upload.id }),
      });

      if (!parseRes.ok) {
        const data = await parseRes.json().catch(() => ({}));
        setStatus({
          kind: "error",
          message:
            data.error ??
            "AI parsing failed. Check your ANTHROPIC_API_KEY and try again.",
        });
        return;
      }

      const parsed = await parseRes.json();
      setStatus({ kind: "idle" });

      if (uploadType === "RECEIPT") {
        onParseComplete({
          uploadId: upload.id,
          type: "RECEIPT",
          preview: parsed.preview,
        });
      } else {
        onParseComplete({
          uploadId: upload.id,
          type: "BANK_STATEMENT",
          previews: parsed.previews,
        });
      }
    },
    [uploadType, onParseComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: status.kind !== "idle",
    onDrop: handleDrop,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      setStatus({
        kind: "error",
        message:
          err?.code === "file-too-large"
            ? "File exceeds 10 MB limit."
            : err?.code === "file-invalid-type"
            ? "Only PDF files are accepted."
            : "Invalid file.",
      });
    },
  });

  const busy = status.kind === "uploading" || status.kind === "parsing";

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2">
        {(["RECEIPT", "BANK_STATEMENT"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={uploadType === t ? "default" : "outline"}
            disabled={busy}
            onClick={() => setUploadType(t)}
          >
            {t === "RECEIPT" ? "🧾 Receipt" : "🏦 Bank Statement"}
          </Button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragActive && "border-primary bg-primary/5",
          busy && "cursor-not-allowed opacity-60",
          !busy && !isDragActive && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
          status.kind === "error" && "border-destructive/50"
        )}
      >
        <input {...getInputProps()} />

        {status.kind === "idle" && (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UploadIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {isDragActive ? "Drop your PDF here" : "Drag & drop a PDF"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse · max 10 MB
              </p>
            </div>
          </>
        )}

        {status.kind === "uploading" && (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="font-medium">Uploading…</p>
          </>
        )}

        {status.kind === "parsing" && (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="font-medium">AI is reading your document…</p>
            <p className="text-sm text-muted-foreground">This may take a few seconds</p>
          </>
        )}

        {status.kind === "error" && (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">{status.message}</p>
              <p className="text-sm text-muted-foreground">
                Click to try again
              </p>
            </div>
          </>
        )}
      </div>

      {/* File type hint */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5" />
        {uploadType === "RECEIPT"
          ? "Upload a single receipt PDF to extract merchant, amount, and items."
          : "Upload a bank statement PDF to extract all transactions."}
      </p>
    </div>
  );
}
