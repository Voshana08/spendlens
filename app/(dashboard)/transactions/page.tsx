import { Suspense } from "react";
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client";

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsPageClient />
    </Suspense>
  );
}
