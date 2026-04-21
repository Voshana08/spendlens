export type UploadType = "RECEIPT" | "BANK_STATEMENT";

export type ReceiptPreview = {
  description: string;
  amount: number;
  type: "EXPENSE";
  date: string; // YYYY-MM-DD
  categoryId: string;
  isRecurring: false;
  recurrenceInterval: null;
  items: Array<{ description: string; amount: number }>;
  suggestedCategory: string;
};

export type StatementPreview = {
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string; // YYYY-MM-DD
  categoryId: string;
  isRecurring: false;
  recurrenceInterval: null;
  suggestedCategory: string;
};

export type ParseResult =
  | { uploadId: string; type: "RECEIPT"; preview: ReceiptPreview }
  | { uploadId: string; type: "BANK_STATEMENT"; previews: StatementPreview[] };

export type UploadHistoryItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: UploadType;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
};
