import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { bankFeature, cashAccountFeature, paymentFeature } from "@/store/features";
import { bankSelectors, beneficiarySelectors, cashAccountSelectors, paymentSelectors } from "@/store/selectors";
import type { BaseEntity, Payment } from "@/types/domain";
import { formatCurrency } from "@/utils/currency";
import { PaymentForm, type PaymentFormValues } from "@/features/payments/components/PaymentForm";
import { markBeneficiaryDuePaid } from "@/features/beneficiaries/beneficiaryDueStore";
import {
  accountingStorageKey,
  getDefaultAccountId,
  getExpenseAccountCategoryOptions,
  getPaymentExpenseAccount,
  normalizeExpenseAccountCategory,
  readAccountingAccounts,
  removeJournalEntriesForSource,
  replaceJournalEntriesForSource,
  type AccountingJournalEntry,
} from "@/features/accounting/accountingAccounts";

interface BeneficiaryDuePaymentDraft {
  dueId: string;
  beneficiaryEntityId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryMobile: string;
  category: string;
  supportType: string;
  fromDate: string;
  toDate?: string;
  amount: number;
}

export default function PaymentsPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const payments = useAppSelector(paymentSelectors.selectAll);
  const beneficiaries = useAppSelector(beneficiarySelectors.selectAll);
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const bankAccounts = useAppSelector(bankSelectors.selectAll);
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [currency, setCurrency] = useState("");
  const [accountHeads, setAccountHeads] = useState(() => readAccountingAccounts());

  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<BeneficiaryDuePaymentDraft | null>(null);
  const [paymentLog, setPaymentLog] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { beneficiaryDuePayment?: BeneficiaryDuePaymentDraft } | null;
    if (!state?.beneficiaryDuePayment) return;
    setPaymentDraft(state.beneficiaryDuePayment);
    setEditingPayment(null);
    setIsCreating(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const syncAccounts = (event: StorageEvent) => {
      if (event.key === accountingStorageKey) setAccountHeads(readAccountingAccounts());
    };
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, []);

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          (!status || payment.status === status) &&
          (!method || payment.method === method) &&
          (!currency || payment.amount.currency === currency),
      ),
    [currency, method, payments, status],
  );

  const cashAccountOptions = useMemo(
    () => cashAccounts.map((account) => ({ id: account.id, label: `${account.userName} / ${account.phoneNumber}` })),
    [cashAccounts],
  );
  const bankAccountOptions = useMemo(
    () => bankAccounts.map((account) => ({ id: account.id, label: `${account.accountName} / ${account.accountNumber}` })),
    [bankAccounts],
  );
  const beneficiaryOptions = useMemo(
    () =>
      beneficiaries.map((beneficiary) => ({
        id: beneficiary.beneficiaryId,
        name: beneficiary.name,
        label: `${beneficiary.beneficiaryId} / ${beneficiary.name}`,
      })),
    [beneficiaries],
  );
  const categoryOptions = useMemo(() => getExpenseAccountCategoryOptions(accountHeads), [accountHeads]);

  const getNextVoucherNumber = () => {
    const nextNumber =
      payments.reduce((largest, payment) => {
        const match = payment.voucherNumber.match(/^VCH-(\d+)$/i);
        return match ? Math.max(largest, Number(match[1])) : largest;
      }, 0) + 1;

    return `VCH-${String(nextNumber).padStart(6, "0")}`;
  };

  const getBeneficiaryName = (beneficiaryId: string) =>
    beneficiaryOptions.find((beneficiary) => beneficiary.id === beneficiaryId)?.name ??
    beneficiaries.find((beneficiary) => beneficiary.id === beneficiaryId)?.name ??
    "";

  const getBeneficiaryCode = (beneficiaryId: string) =>
    beneficiaryOptions.find((beneficiary) => beneficiary.id === beneficiaryId)?.id ??
    beneficiaries.find((beneficiary) => beneficiary.id === beneficiaryId)?.beneficiaryId ??
    beneficiaryId;

  const getPaymentAccountName = (values: Pick<PaymentFormValues, "method" | "accountId">) => {
    const options = values.method === "Bank" ? bankAccountOptions : cashAccountOptions;
    return options.find((account) => account.id === values.accountId)?.label ?? "";
  };

  const getPaymentBalanceImpact = (payment: Pick<Payment, "method" | "accountId" | "amount">) => {
    if (payment.method === "Bank") {
      const bank = bankAccounts.find((account) => account.id === payment.accountId);
      if (!bank) return 0;
      return bank.currency === payment.amount.currency ? payment.amount.originalAmount : payment.amount.convertedAmount;
    }
    return payment.amount.convertedAmount;
  };

  const applyPaymentBalance = (target: Pick<Payment, "method" | "accountId" | "amount">, direction: 1 | -1) => {
    const delta = getPaymentBalanceImpact(target) * direction;
    if (target.method === "Bank") {
      const bank = bankAccounts.find((account) => account.id === target.accountId);
      if (!bank) return;
      void dispatch(bankFeature.updateOne({ id: bank.id, patch: { currentBalance: bank.currentBalance + delta } }) as never);
      return;
    }

    const cashAccount = cashAccounts.find((account) => account.id === target.accountId);
    if (!cashAccount) return;
    void dispatch(cashAccountFeature.updateOne({ id: cashAccount.id, patch: { currentBalance: cashAccount.currentBalance + delta } }) as never);
  };

  const applyPaymentEditBalance = (
    previous: Pick<Payment, "method" | "accountId" | "amount">,
    next: Pick<Payment, "method" | "accountId" | "amount">,
  ) => {
    const sameAccount = previous.method === next.method && previous.accountId === next.accountId;
    if (!sameAccount) {
      applyPaymentBalance(previous, 1);
      applyPaymentBalance(next, -1);
      return;
    }

    const delta = getPaymentBalanceImpact(previous) - getPaymentBalanceImpact(next);
    if (next.method === "Bank") {
      const bank = bankAccounts.find((account) => account.id === next.accountId);
      if (!bank) return;
      void dispatch(bankFeature.updateOne({ id: bank.id, patch: { currentBalance: bank.currentBalance + delta } }) as never);
      return;
    }

    const cashAccount = cashAccounts.find((account) => account.id === next.accountId);
    if (!cashAccount) return;
    void dispatch(cashAccountFeature.updateOne({ id: cashAccount.id, patch: { currentBalance: cashAccount.currentBalance + delta } }) as never);
  };

  const writePaymentJournal = (payment: Payment) => {
    const assetAccountId = `${payment.method === "Bank" ? "bank" : "cash"}__${payment.accountId}`;
    const expenseAccountName = getPaymentExpenseAccount(payment.category);
    const expenseAccountId = getDefaultAccountId("expenses", expenseAccountName);
    const assetAmount = getPaymentBalanceImpact(payment);
    const entries: AccountingJournalEntry[] = [
      {
        id: `payment-${payment.voucherNumber}-expense`,
        sourceType: "Payment",
        sourceReference: payment.voucherNumber,
        date: payment.date,
        accountId: expenseAccountId,
        accountName: expenseAccountName,
        group: "expenses",
        debit: payment.amount.convertedAmount,
        credit: 0,
        currency: "INR",
        party: payment.beneficiaryName ? `${payment.beneficiaryId} / ${payment.beneficiaryName}` : payment.beneficiaryId,
        category: payment.category,
        narration: payment.narration,
      },
      {
        id: `payment-${payment.voucherNumber}-asset`,
        sourceType: "Payment",
        sourceReference: payment.voucherNumber,
        date: payment.date,
        accountId: assetAccountId,
        accountName: payment.accountName,
        group: "assets",
        debit: 0,
        credit: assetAmount,
        currency: payment.method === "Bank" ? (bankAccounts.find((account) => account.id === payment.accountId)?.currency ?? "INR") : "INR",
        party: payment.beneficiaryName ? `${payment.beneficiaryId} / ${payment.beneficiaryName}` : payment.beneficiaryId,
        category: payment.category,
        narration: payment.narration,
      },
    ];
    replaceJournalEntriesForSource("Payment", payment.voucherNumber, entries);
  };

  const handleCreate = (values: PaymentFormValues) => {
    const accountName = getPaymentAccountName(values);
    const payment = { ...values, beneficiaryName: values.beneficiaryName || getBeneficiaryName(values.beneficiaryId), accountName } as Omit<Payment, keyof BaseEntity>;
    void dispatch(paymentFeature.createOne(payment) as never);
    applyPaymentBalance(payment, -1);
    writePaymentJournal({ ...payment, id: values.voucherNumber, createdAt: values.date, updatedAt: values.date, createdBy: "system", updatedBy: "system" });
    notify({ tone: "success", title: "Record created", description: `${values.voucherNumber} was added to the register.` });
    if (paymentDraft) {
      markBeneficiaryDuePaid({
        beneficiaryEntityId: paymentDraft.beneficiaryEntityId,
        dueId: paymentDraft.dueId,
        voucherNumber: values.voucherNumber,
        date: values.date,
        amount: values.amount.convertedAmount,
      });
      setPaymentLog(
        `${paymentDraft.beneficiaryName} (${paymentDraft.beneficiaryId}) payment created for ${formatCurrency(values.amount.originalAmount, values.amount.currency)}.`,
      );
      setPaymentDraft(null);
    }
    setIsCreating(false);
  };

  const handleEdit = (values: PaymentFormValues) => {
    if (!editingPayment) return;
    const accountName = getPaymentAccountName(values);
    const payment = { ...editingPayment, ...values, beneficiaryName: values.beneficiaryName || getBeneficiaryName(values.beneficiaryId), accountName };
    void dispatch(paymentFeature.updateOne({ id: editingPayment.id, patch: payment as Partial<Payment> }) as never);
    applyPaymentEditBalance(editingPayment, payment);
    writePaymentJournal(payment);
    notify({ tone: "success", title: "Record updated", description: `${values.voucherNumber} changes were saved.` });
    setEditingPayment(null);
  };

  const handleDelete = () => {
    if (!deletingPayment) return;
    applyPaymentBalance(deletingPayment, 1);
    removeJournalEntriesForSource("Payment", deletingPayment.voucherNumber);
    void dispatch(paymentFeature.deleteOne({ id: deletingPayment.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Record deleted", description: `${deletingPayment.voucherNumber} was soft-deleted.` });
    setDeletingPayment(null);
  };

  const columns: ColumnDef<Payment>[] = [
    { accessorKey: "voucherNumber", header: "Voucher" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "beneficiaryName", header: "Beneficiary", cell: ({ row }) => row.original.beneficiaryName || getBeneficiaryName(row.original.beneficiaryId) || row.original.beneficiaryId },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "amount.originalAmount", header: "Original", cell: ({ row }) => formatCurrency(row.original.amount.originalAmount, row.original.amount.currency) },
    { accessorKey: "method", header: "Method" },
    { accessorKey: "accountName", header: "Account", cell: ({ row }) => row.original.accountName || getPaymentAccountName(row.original) || "-" },
    { accessorKey: "approvedBy", header: "Approved By" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="payments:approve">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingPayment(row.original)}
              aria-label={`Edit ${row.original.voucherNumber}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingPayment(row.original)}
              aria-label={`Delete ${row.original.voucherNumber}`}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </PermissionGuard>
      ),
    },
  ];

  const createDraftDefaults = (draft: BeneficiaryDuePaymentDraft): PaymentFormValues => ({
    voucherNumber: getNextVoucherNumber(),
    date: new Date().toISOString().slice(0, 10),
    beneficiaryId: draft.beneficiaryId,
    beneficiaryName: draft.beneficiaryName,
    category: normalizeExpenseAccountCategory(draft.category, categoryOptions) || categoryOptions[0] || "",
    amount: {
      originalAmount: draft.amount,
      currency: "INR",
      exchangeRate: 1,
      convertedAmount: draft.amount,
    },
    method: "Cash",
    approvedBy: "TWA Administrator",
    paidBy: "TWA Administrator",
    accountId: cashAccountOptions[0]?.id ?? "",
    narration: `${draft.supportType} ${draft.category} payment for ${draft.beneficiaryName} from ${new Date(draft.fromDate).toLocaleDateString()} to ${new Date(draft.toDate ?? draft.fromDate).toLocaleDateString()}`,
    status: "Paid",
  });

  const createPaymentDefaults = (): Partial<PaymentFormValues> => ({
    voucherNumber: getNextVoucherNumber(),
    date: new Date().toISOString().slice(0, 10),
    amount: {
      originalAmount: 0,
      currency: "INR",
      exchangeRate: 1,
      convertedAmount: 0,
    },
    method: "Cash",
    accountId: cashAccountOptions[0]?.id ?? "",
    approvedBy: "TWA Administrator",
    paidBy: "TWA Administrator",
    status: "Paid",
  });

  return (
    <ModulePage
      title="Payment Management"
      description="Vouchers, approvals, beneficiary payments, and payment records."
      data={filteredPayments}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Pending", "Approved", "Paid"]} />
          <SelectFilter label="Method" value={method} onChange={setMethod} options={["Bank", "Cash"]} />
          <SelectFilter label="Currency" value={currency} onChange={setCurrency} options={["KWD", "INR"]} />
        </>
      }
    >
      {paymentLog && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {paymentLog}
        </div>
      )}

      <div className="flex justify-end">
        <PermissionGuard permission="payments:approve">
          <Button
            onClick={() => {
              setPaymentDraft(null);
              setIsCreating(true);
            }}
            type="button"
          >
            <CopyPlus className="h-4 w-4" />
            Create payment
          </Button>
        </PermissionGuard>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal
          title="Create payment"
          onClose={() => {
            setIsCreating(false);
            setPaymentDraft(null);
          }}
        >
          <PaymentForm
            defaultValues={paymentDraft ? createDraftDefaults(paymentDraft) : createPaymentDefaults()}
            beneficiaries={beneficiaryOptions}
            categoryOptions={categoryOptions}
            cashAccounts={cashAccountOptions}
            bankAccounts={bankAccountOptions}
            onSubmit={handleCreate}
            onCancel={() => {
              setIsCreating(false);
              setPaymentDraft(null);
            }}
            submitLabel="Create"
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingPayment && (
        <Modal title={`Edit ${editingPayment.voucherNumber}`} onClose={() => setEditingPayment(null)}>
          <PaymentForm
            defaultValues={{
              voucherNumber: editingPayment.voucherNumber,
              date: editingPayment.date,
              beneficiaryId: getBeneficiaryCode(editingPayment.beneficiaryId),
              beneficiaryName: editingPayment.beneficiaryName || getBeneficiaryName(editingPayment.beneficiaryId),
              category: normalizeExpenseAccountCategory(editingPayment.category, categoryOptions),
              amount: editingPayment.amount,
              method: editingPayment.method,
              accountId: editingPayment.accountId || (editingPayment.method === "Bank" ? bankAccountOptions[0]?.id : cashAccountOptions[0]?.id) || "",
              approvedBy: editingPayment.approvedBy,
              paidBy: editingPayment.paidBy,
              narration: editingPayment.narration,
              status: editingPayment.status,
            }}
            onSubmit={handleEdit}
            beneficiaries={beneficiaryOptions}
            categoryOptions={categoryOptions}
            cashAccounts={cashAccountOptions}
            bankAccounts={bankAccountOptions}
            onCancel={() => setEditingPayment(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingPayment && (
        <ConfirmationDialog
          title={`Delete ${deletingPayment.voucherNumber}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingPayment(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
