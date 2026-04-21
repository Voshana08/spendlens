import { UploadPageClient } from "@/components/upload/upload-page-client";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload</h1>
        <p className="text-muted-foreground">
          Import transactions from a receipt or bank statement PDF.
        </p>
      </div>
      <UploadPageClient />
    </div>
  );
}
