import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useLocation } from "react-router";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { ModulePage } from "@/components/shared/ModulePage";
import { CollectionForm } from "@/features/collections/components/CollectionForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { bankFeature, cashAccountFeature, collectionFeature } from "@/store/features";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { bankSelectors, cashAccountSelectors, collectionSelectors } from "@/store/selectors";
import type { Collection, Currency } from "@/types/domain";
import { formatCurrency } from "@/utils/currency";
import { convertCurrency } from "@/utils/currency";
import { exchangeRates } from "@/services/mock/mockData";
import type { CollectionFormValues } from "@/features/collections/schemas/collectionSchema";
import {
  getDefaultAccountId,
  getReceiptIncomeAccount,
  removeJournalEntriesForSource,
  replaceJournalEntriesForSource,
  type AccountingJournalEntry,
} from "@/features/accounting/accountingAccounts";
import { markMemberDuePaid } from "@/features/members/memberDueStore";

interface MemberDueReceiptState {
  memberDueReceipt?: {
    dueId: string;
    memberEntityId: string;
    memberName: string;
    memberId: string;
    memberContact: string;
    category: "Subscription" | "Sponsorship";
    subscriptionType: string;
    fromDate: string;
    toDate?: string;
    amount: number;
  };
}

export default function CollectionsPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { notify } = useToast();
  const collections = useAppSelector(collectionSelectors.selectAll);
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const bankAccounts = useAppSelector(bankSelectors.selectAll);
  const [editing, setEditing] = useState<Collection | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Collection | undefined>();
  const [category, setCategory] = useState("");
  const [currency, setCurrency] = useState("");
  const [depositStatus, setDepositStatus] = useState("");
  const [receiptDraft, setReceiptDraft] = useState<MemberDueReceiptState["memberDueReceipt"]>();
  const [paymentLog, setPaymentLog] = useState<MemberDueReceiptState["memberDueReceipt"]>();
  const now = new Date().toISOString();
  const routedReceipt = (location.state as MemberDueReceiptState | null)?.memberDueReceipt;

  const getNextReceiptNumber = () => {
    const nextNumber =
      collections.reduce((largest, collection) => {
        const match = collection.receiptNumber.match(/^RCPT-(\d+)$/i);
        return match ? Math.max(largest, Number(match[1])) : largest;
      }, 0) + 1;

    return `RCPT-${String(nextNumber).padStart(6, "0")}`;
  };

  useEffect(() => {
    if (!routedReceipt) return;
    setReceiptDraft(routedReceipt);
    setIsFormOpen(true);
    setEditing(undefined);
  }, [routedReceipt]);

  const cashAccountOptions = useMemo(
    () => cashAccounts.map((account) => ({ id: account.id, label: `${account.userName} / ${account.phoneNumber}` })),
    [cashAccounts],
  );
  const bankAccountOptions = useMemo(
    () => bankAccounts.map((account) => ({ id: account.id, label: `${account.accountName} / ${account.accountNumber}` })),
    [bankAccounts],
  );

  const getSelectedAccountName = (values: CollectionFormValues) => {
    const options = values.accountType === "Bank" ? bankAccountOptions : cashAccountOptions;
    return options.find((account) => account.id === values.accountId)?.label ?? "";
  };

  const getBalanceImpact = (collection: Pick<Collection, "accountType" | "accountId" | "amount">) => {
    if (collection.accountType === "Bank") {
      const bank = bankAccounts.find((account) => account.id === collection.accountId);
      if (!bank) return 0;
      return bank.currency === collection.amount.currency ? collection.amount.originalAmount : collection.amount.convertedAmount;
    }
    return collection.amount.convertedAmount;
  };

  const applyReceiptBalance = (
    target: Pick<Collection, "accountType" | "accountId" | "amount">,
    direction: 1 | -1,
  ) => {
    if (target.accountType === "Bank") {
      const bank = bankAccounts.find((account) => account.id === target.accountId);
      if (!bank) return;
      const delta = getBalanceImpact(target) * direction;
      void dispatch(bankFeature.updateOne({ id: bank.id, patch: { currentBalance: bank.currentBalance + delta } }) as never);
      return;
    }

    const cashAccount = cashAccounts.find((account) => account.id === target.accountId);
    if (!cashAccount) return;
    const delta = getBalanceImpact(target) * direction;
    void dispatch(cashAccountFeature.updateOne({ id: cashAccount.id, patch: { currentBalance: cashAccount.currentBalance + delta } }) as never);
  };

  const applyReceiptEditBalance = (
    previous: Pick<Collection, "accountType" | "accountId" | "amount">,
    next: Pick<Collection, "accountType" | "accountId" | "amount">,
  ) => {
    const sameAccount = previous.accountType === next.accountType && previous.accountId === next.accountId;
    if (!sameAccount) {
      applyReceiptBalance(previous, -1);
      applyReceiptBalance(next, 1);
      return;
    }

    const delta = getBalanceImpact(next) - getBalanceImpact(previous);
    if (next.accountType === "Bank") {
      const bank = bankAccounts.find((account) => account.id === next.accountId);
      if (!bank) return;
      void dispatch(bankFeature.updateOne({ id: bank.id, patch: { currentBalance: bank.currentBalance + delta } }) as never);
      return;
    }

    const cashAccount = cashAccounts.find((account) => account.id === next.accountId);
    if (!cashAccount) return;
    void dispatch(cashAccountFeature.updateOne({ id: cashAccount.id, patch: { currentBalance: cashAccount.currentBalance + delta } }) as never);
  };

  const writeReceiptJournal = (collection: Collection) => {
    const assetAccountId = `${collection.accountType === "Bank" ? "bank" : "cash"}__${collection.accountId}`;
    const incomeAccountName = getReceiptIncomeAccount(collection.category);
    const incomeAccountId = getDefaultAccountId("income", incomeAccountName);
    const assetAmount = getBalanceImpact(collection);
    const entries: AccountingJournalEntry[] = [
      {
        id: `receipt-${collection.receiptNumber}-asset`,
        sourceType: "Receipt",
        sourceReference: collection.receiptNumber,
        date: collection.date,
        accountId: assetAccountId,
        accountName: collection.accountName,
        group: "assets",
        debit: assetAmount,
        credit: 0,
        currency: collection.accountType === "Bank" ? (bankAccounts.find((account) => account.id === collection.accountId)?.currency ?? "INR") : "INR",
        party: collection.donorName,
        category: collection.category,
        narration: collection.narration,
      },
      {
        id: `receipt-${collection.receiptNumber}-income`,
        sourceType: "Receipt",
        sourceReference: collection.receiptNumber,
        date: collection.date,
        accountId: incomeAccountId,
        accountName: incomeAccountName,
        group: "income",
        debit: 0,
        credit: collection.amount.convertedAmount,
        currency: "INR",
        party: collection.donorName,
        category: collection.category,
        narration: collection.narration,
      },
    ];
    replaceJournalEntriesForSource("Receipt", collection.receiptNumber, entries);
  };

  const saveCollection = (values: CollectionFormValues) => {
    const amount = convertCurrency(values.amount, values.currency, values.date, exchangeRates);
    const accountName = getSelectedAccountName(values);
    if (editing) {
      const updatedCollection: Collection = {
        ...editing,
        date: values.date,
        donorName: values.donorName,
        donorContact: values.donorContact,
        amount,
        category: values.category as Collection["category"],
        collectedBy: values.collectedBy,
        method: values.method,
        accountType: values.accountType,
        accountId: values.accountId,
        accountName,
        depositStatus: values.depositStatus,
        narration: values.narration ?? "",
      };
      void dispatch(
        collectionFeature.updateOne({
          id: editing.id,
          patch: updatedCollection,
        }),
      );
      applyReceiptEditBalance(editing, { accountType: values.accountType, accountId: values.accountId, amount });
      writeReceiptJournal(updatedCollection);
      notify({ tone: "success", title: "Receipt updated", description: `${editing.receiptNumber} changes were saved.` });
      setEditing(undefined);
      setIsFormOpen(false);
      return;
    }

    const receiptNumber = getNextReceiptNumber();
    const newCollection = {
      receiptNumber,
      date: values.date,
      donorName: values.donorName,
      donorContact: values.donorContact,
      amount,
      category: values.category as Collection["category"],
      collectedBy: values.collectedBy,
      method: values.method,
      accountType: values.accountType,
      accountId: values.accountId,
      accountName,
      depositStatus: values.depositStatus,
      narration: values.narration ?? "",
    };
    void dispatch(
      collectionFeature.createOne(newCollection),
    );
    applyReceiptBalance({ accountType: values.accountType, accountId: values.accountId, amount }, 1);
    writeReceiptJournal({ ...newCollection, id: receiptNumber, createdAt: now, updatedAt: now, createdBy: "system", updatedBy: "system" });
    notify({ tone: "success", title: "Receipt created", description: "The new collection receipt was added." });
    if (receiptDraft) {
      markMemberDuePaid({
        memberEntityId: receiptDraft.memberEntityId,
        dueId: receiptDraft.dueId,
        receiptNumber,
        date: values.date,
        amount: amount.convertedAmount,
      });
      setPaymentLog(receiptDraft);
      setReceiptDraft(undefined);
    }
    setIsFormOpen(false);
  };

  const columns: ColumnDef<Collection>[] = [
    { accessorKey: "receiptNumber", header: "Receipt" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "donorName", header: "Donor" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "accountName", header: "Account" },
    { accessorKey: "amount.originalAmount", header: "Original", cell: ({ row }) => formatCurrency(row.original.amount.originalAmount, row.original.amount.currency) },
    { accessorKey: "amount.convertedAmount", header: "INR", cell: ({ row }) => formatCurrency(row.original.amount.convertedAmount, "INR") },
    { accessorKey: "depositStatus", header: "Deposit Status", cell: ({ row }) => <StatusBadge status={row.original.depositStatus} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="collections:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200"
              onClick={() => {
                setEditing(row.original);
                setIsFormOpen(true);
              }}
              aria-label="Edit collection"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setPendingDelete(row.original)}
              aria-label="Delete collection"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </PermissionGuard>
      ),
    },
  ];

  const filteredCollections = useMemo(
    () =>
      collections.filter(
        (collection) =>
          (!category || collection.category === category) &&
          (!currency || collection.amount.currency === currency) &&
          (!depositStatus || collection.depositStatus === depositStatus),
      ),
    [category, collections, currency, depositStatus],
  );

  return (
    <ModulePage
      title="Collection Management"
      description="Receipts, categories, collectors, original currency, and INR conversion."
      data={filteredCollections}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Category" value={category} onChange={setCategory} options={[...new Set(collections.map((item) => item.category))]} />
          <SelectFilter label="Currency" value={currency} onChange={setCurrency} options={["KWD", "INR"]} />
          <SelectFilter label="Deposit Status" value={depositStatus} onChange={setDepositStatus} options={["With Executive", "With Treasurer", "Deposited"]} />
        </>
      }
    >
      {paymentLog && (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Member due receipt created</p>
              <p className="mt-1 text-xs">
                {paymentLog.memberName} / {paymentLog.memberId} / {paymentLog.category} / {paymentLog.subscriptionType}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(paymentLog.amount, "INR")}</p>
              <p className="mt-1 text-xs">Receipt form submitted</p>
            </div>
          </div>
        </div>
      )}

      <PermissionGuard permission="collections:manage">
        <div className="flex justify-end">
                    <Button
            onClick={() => {
              setEditing(undefined);
              setReceiptDraft(undefined);
              setIsFormOpen(true);
            }}
            type="button"
          >
            Create receipt
          </Button>
        </div>
        {isFormOpen && (
          <Modal
            title={editing ? `Edit ${editing.receiptNumber}` : "Create Collection Receipt"}
            onClose={() => {
              setEditing(undefined);
              setReceiptDraft(undefined);
              setIsFormOpen(false);
            }}
          >
            <CollectionForm
              key={editing?.id ?? "new"}
              onSubmit={saveCollection}
              submitLabel={editing ? "Update receipt" : "Create receipt"}
              receiptNumber={editing?.receiptNumber ?? getNextReceiptNumber()}
              defaultValues={
                editing
                  ? {
                      date: editing.date.slice(0, 10),
                      donorName: editing.donorName,
                      donorContact: editing.donorContact,
                      amount: editing.amount.originalAmount,
                      currency: editing.amount.currency,
                      category: editing.category,
                      collectedBy: editing.collectedBy,
                      method: editing.method,
                      depositStatus: editing.depositStatus,
                      accountType: editing.accountType,
                      accountId: editing.accountId,
                      narration: editing.narration,
                    }
                  : receiptDraft
                    ? {
                        date: new Date().toISOString().slice(0, 10),
                        donorName: receiptDraft.memberName,
                        donorContact: receiptDraft.memberContact,
                        amount: receiptDraft.amount,
                        currency: "INR" as Currency,
                        category: receiptDraft.category === "Subscription" ? "Monthly Subscription" : "General Charity Collection",
                        collectedBy: "TWA Administrator",
                        method: "Cash",
                        depositStatus: "With Treasurer",
                        accountType: "Cash",
                        accountId: cashAccountOptions[0]?.id ?? "",
                        narration: `${receiptDraft.category} payment for ${receiptDraft.memberId} (${receiptDraft.subscriptionType} from ${new Date(receiptDraft.fromDate).toLocaleDateString()} to ${new Date(receiptDraft.toDate ?? receiptDraft.fromDate).toLocaleDateString()})`,
                      }
                    : undefined
              }
              cashAccounts={cashAccountOptions}
              bankAccounts={bankAccountOptions}
            />
            {editing && (
              <Button
                className="mt-3 bg-slate-600 hover:bg-slate-700"
                onClick={() => {
                  setEditing(undefined);
                  setReceiptDraft(undefined);
                  setIsFormOpen(false);
                }}
                type="button"
              >
                Cancel edit
              </Button>
            )}
          </Modal>
        )}
      </PermissionGuard>
      {pendingDelete && (
        <ConfirmationDialog
          title={`Delete ${pendingDelete.receiptNumber}?`}
          description="This will soft-delete the receipt from active registers while preserving audit-ready history."
          confirmLabel="Delete receipt"
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => {
            applyReceiptBalance(pendingDelete, -1);
            removeJournalEntriesForSource("Receipt", pendingDelete.receiptNumber);
            void dispatch(collectionFeature.deleteOne({ id: pendingDelete.id, deletedBy: "TWA Administrator" }));
            notify({ tone: "success", title: "Receipt deleted", description: `${pendingDelete.receiptNumber} was soft-deleted.` });
            setPendingDelete(undefined);
          }}
        />
      )}
    </ModulePage>
  );
}
