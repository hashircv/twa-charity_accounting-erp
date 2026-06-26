import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, CopyPlus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectControl } from "@/components/forms/FormField";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { bankFeature, cashAccountFeature } from "@/store/features";
import { bankSelectors, cashAccountSelectors } from "@/store/selectors";
import type { BankAccount, CashAccount, Currency } from "@/types/domain";
import {
  replaceJournalEntriesForSource,
  type AccountingJournalEntry,
} from "@/features/accounting/accountingAccounts";
import { formatCurrency } from "@/utils/currency";

type TransferAccount =
  | { id: string; accountId: string; type: "bank"; name: string; label: string; currency: Currency; balance: number; party: string }
  | { id: string; accountId: string; type: "cash"; name: string; label: string; currency: "INR"; balance: number; party: string };

interface InterchangeTransaction {
  id: string;
  date: string;
  fromAccountName: string;
  toAccountName: string;
  currency: Currency;
  amount: number;
  narration: string;
}

export default function InterchangePage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const banks = useAppSelector(bankSelectors.selectAll);
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [kwdAmount, setKwdAmount] = useState("");
  const [inrAmount, setInrAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [transactions, setTransactions] = useState<InterchangeTransaction[]>([]);

  const accountOptions = useMemo<TransferAccount[]>(
    () => [
      ...cashAccounts.map((account: CashAccount) => ({
        id: `cash:${account.id}`,
        accountId: account.id,
        type: "cash" as const,
        name: `${account.userName} / ${account.phoneNumber}`,
        label: `Cash - ${account.userName} (${account.phoneNumber})`,
        currency: "INR" as const,
        balance: account.currentBalance,
        party: account.userName,
      })),
      ...banks.map((bank: BankAccount) => ({
        id: `bank:${bank.id}`,
        accountId: bank.id,
        type: "bank" as const,
        name: `${bank.accountName} / ${bank.accountNumber}`,
        label: `Bank - ${bank.accountName} (${bank.currency})`,
        currency: bank.currency,
        balance: bank.currentBalance,
        party: bank.accountName,
      })),
    ],
    [banks, cashAccounts],
  );

  const selectedFromAccount = accountOptions.find((account) => account.id === fromAccountId);
  const selectedToAccount = accountOptions.find((account) => account.id === toAccountId);

  const getAccountAmount = (account: TransferAccount | undefined, kwd: number, inr: number) =>
    account?.currency === "KWD" ? kwd : inr;

  const updateAccountBalance = (account: TransferAccount, amount: number) => {
    if (account.type === "bank") {
      void dispatch(
        bankFeature.updateOne({
          id: account.accountId,
          patch: { currentBalance: Number((account.balance + amount).toFixed(3)) },
        }) as never,
      );
      return;
    }

    void dispatch(
      cashAccountFeature.updateOne({
        id: account.accountId,
        patch: { currentBalance: Number((account.balance + amount).toFixed(3)) },
      }) as never,
    );
  };

  const getJournalAccountId = (account: TransferAccount) => `${account.type}__${account.accountId}`;

  const handleRecord = () => {
    const fromAccount = accountOptions.find((account) => account.id === fromAccountId);
    const toAccount = accountOptions.find((account) => account.id === toAccountId);
    const kwdTransferAmount = Number(kwdAmount) || 0;
    const inrTransferAmount = Number(inrAmount) || 0;
    const fromAmount = getAccountAmount(fromAccount, kwdTransferAmount, inrTransferAmount);
    const toAmount = getAccountAmount(toAccount, kwdTransferAmount, inrTransferAmount);

    if (!fromAccount || !toAccount || fromAccount.id === toAccount.id || fromAmount <= 0 || toAmount <= 0) {
      notify({
        tone: "error",
        title: "Interchange not saved",
        description: "Select different from/to accounts and enter valid amount values.",
      });
      return;
    }

    if (fromAmount > fromAccount.balance) {
      notify({
        tone: "error",
        title: "Insufficient balance",
        description: `${fromAccount.name} does not have enough funds.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const reference = `INT-${String(transactions.length + 1).padStart(6, "0")}`;
    const transferNarration = narration || `Interchange: ${fromAccount.name} to ${toAccount.name}`;
    const amountDescription =
      kwdTransferAmount > 0 && inrTransferAmount > 0
        ? `${formatCurrency(kwdTransferAmount, "KWD")} / ${formatCurrency(inrTransferAmount, "INR")}`
        : formatCurrency(fromAmount, fromAccount.currency);

    updateAccountBalance(fromAccount, -fromAmount);
    updateAccountBalance(toAccount, toAmount);

    const entries: AccountingJournalEntry[] = [
      {
        id: `${reference}-from-credit`,
        sourceType: "Interchange",
        sourceReference: reference,
        date: now,
        accountId: getJournalAccountId(fromAccount),
        accountName: fromAccount.name,
        group: "assets",
        debit: 0,
        credit: fromAmount,
        currency: fromAccount.currency,
        party: toAccount.party,
        category: "Interchange",
        narration: transferNarration,
      },
      {
        id: `${reference}-to-debit`,
        sourceType: "Interchange",
        sourceReference: reference,
        date: now,
        accountId: getJournalAccountId(toAccount),
        accountName: toAccount.name,
        group: "assets",
        debit: toAmount,
        credit: 0,
        currency: toAccount.currency,
        party: fromAccount.party,
        category: "Interchange",
        narration: transferNarration,
      },
    ];
    replaceJournalEntriesForSource("Interchange", reference, entries);

    setTransactions((current) => [
      {
        id: reference,
        date: now,
        fromAccountName: fromAccount.name,
        toAccountName: toAccount.name,
        currency: fromAccount.currency,
        amount: fromAmount,
        narration: transferNarration,
      },
      ...current,
    ]);

    notify({
      tone: "success",
      title: "Interchange recorded",
      description: `${amountDescription} moved from ${fromAccount.name} to ${toAccount.name}.`,
    });

    setFromAccountId("");
    setToAccountId("");
    setKwdAmount("");
    setInrAmount("");
    setNarration("");
    setIsCreating(false);
  };

  const columns: ColumnDef<InterchangeTransaction>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "fromAccountName", header: "From" },
    { accessorKey: "toAccountName", header: "To" },
    { accessorKey: "currency", header: "Currency" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency) },
    { accessorKey: "narration", header: "Narration" },
  ];

  return (
    <ModulePage
      title="Interchange"
      description="Record fund movements between cash accounts and bank accounts."
      data={transactions}
      columns={columns}
    >
      <PermissionGuard permission="custody:manage">
        <div className="flex justify-end">
          <Button type="button" onClick={() => setIsCreating(true)}>
            <CopyPlus className="h-4 w-4" />
            Create interchange
          </Button>
        </div>
      </PermissionGuard>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ArrowLeftRight className="h-4 w-4" />
        Cash and bank balances are updated immediately and posted to Account Heads.
      </div>

      {isCreating && (
        <Modal
          title="Create interchange"
          onClose={() => {
            setIsCreating(false);
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">From</span>
                <SelectControl
                  placeholder="Select source account"
                  options={accountOptions.map((account) => ({
                    value: account.id,
                    label: account.label,
                  }))}
                  value={fromAccountId}
                  onChange={(event) => setFromAccountId(event.target.value)}
                />
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">To</span>
                <SelectControl
                  placeholder="Select destination account"
                  options={accountOptions.map((account) => ({
                    value: account.id,
                    label: account.label,
                  }))}
                  value={toAccountId}
                  onChange={(event) => setToAccountId(event.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">KWD Amount</span>
                <input
                  className="h-11 w-full rounded border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 sm:h-10 sm:text-sm"
                  min="0"
                  step="0.001"
                  type="number"
                  value={kwdAmount}
                  onChange={(event) => setKwdAmount(event.target.value)}
                />
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">INR Amount</span>
                <input
                  className="h-11 w-full rounded border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 sm:h-10 sm:text-sm"
                  min="0"
                  step="1"
                  type="number"
                  value={inrAmount}
                  onChange={(event) => setInrAmount(event.target.value)}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Narration</span>
              <input
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900"
                placeholder={
                  selectedFromAccount && selectedToAccount
                    ? `Interchange: ${selectedFromAccount.name} to ${selectedToAccount.name}`
                    : "Optional transfer note"
                }
                value={narration}
                onChange={(event) => setNarration(event.target.value)}
              />
            </label>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button className="bg-slate-600 hover:bg-slate-700" type="button" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleRecord}>
                <Save className="h-4 w-4" />
                Record interchange
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModulePage>
  );
}
