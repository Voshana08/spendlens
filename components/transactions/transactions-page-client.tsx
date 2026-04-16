"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionsFilters } from "./transactions-filters";
import { TransactionsTable, type TransactionRow } from "./transactions-table";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";

export function TransactionsPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRow | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{
    id: string;
    description: string;
  } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleAddClick = () => {
    setSelectedTransaction(null);
    setIsFormOpen(true);
  };

  const handleEdit = (transaction: TransactionRow) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (id: string, description: string) => {
    setTransactionToDelete({ id, description });
    setIsDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    refresh();
    setIsFormOpen(false);
    setSelectedTransaction(null);
  };

  const handleDeleteSuccess = () => {
    refresh();
    setIsDeleteOpen(false);
    setTransactionToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={handleAddClick}>
          <Plus />
          Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <TransactionsFilters />

      {/* Table */}
      <TransactionsTable
        refreshKey={refreshKey}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Dialogs */}
      <TransactionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        transaction={selectedTransaction}
        onSuccess={handleFormSuccess}
      />

      <DeleteTransactionDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        transaction={transactionToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
