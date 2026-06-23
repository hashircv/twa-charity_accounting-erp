import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, BookOpen, CircleDollarSign, Scale, WalletCards } from "lucide-react";
import { Link, useParams } from "react-router";
import { DataTable } from "@/components/tables/DataTable";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useAppSelector } from "@/hooks/redux";
import {
  accountingJournalStorageKey,
  buildPaymentJournalEntries,
  buildReceiptJournalEntries,
  getJournalBalance,
  groupLabels,
  mergeAccountingJournal,
  readAccountingJournal,
  readAccountingAccounts,
  type AccountingAccount,
  type AccountingJournalEntry,
} from "@/features/accounting/accountingAccounts";
import { bankSelectors, cashAccountSelectors, collectionSelectors, paymentSelectors } from "@/store/selectors";
import type { Currency } from "@/types/domain";
import { formatCurrency } from "@/utils/currency";
import { useEffect, useMemo, useState } from "react";

type DetailAccount = AccountingAccount & {
  balance: string;
  currency: Currency | "-";
  sourceType?: "Cash" | "Bank";
  sourceId?: string;
  sourceFields?: Array<[string, string]>;
};

const groupIcons: Record<AccountingAccount["group"], typeof WalletCards> = {
  assets: WalletCards,
  liabilities: Scale,
  income: CircleDollarSign,
  expenses: BookOpen,
};

export default function AccountingDetailPage() {
  const { accountId } = useParams();
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const bankAccounts = useAppSelector(bankSelectors.selectAll);
  const collections = useAppSelector(collectionSelectors.selectAll);
  const payments = useAppSelector(paymentSelectors.selectAll);
  const [journalEntries, setJournalEntries] = useState<AccountingJournalEntry[]>(() => readAccountingJournal());

  useEffect(() => {
    const syncJournal = (event: StorageEvent) => {
      if (event.key === accountingJournalStorageKey) {
        setJournalEntries(readAccountingJournal());
      }
    };

    window.addEventListener("storage", syncJournal);
    return () => window.removeEventListener("storage", syncJournal);
  }, []);

  const effectiveJournalEntries = useMemo(
    () =>
      mergeAccountingJournal(
        journalEntries,
        [
          ...collections.flatMap((collection) => buildReceiptJournalEntries(collection, bankAccounts)),
          ...payments.flatMap((payment) => buildPaymentJournalEntries(payment, bankAccounts, cashAccounts)),
        ],
      ),
    [bankAccounts, cashAccounts, collections, journalEntries, payments],
  );

  const cashId = accountId?.startsWith("cash__") ? accountId.replace("cash__", "") : "";
  const bankId = accountId?.startsWith("bank__") ? accountId.replace("bank__", "") : "";
  const cashAccount = cashAccounts.find((item) => item.id === cashId);
  const bankAccount = bankAccounts.find((item) => item.id === bankId);
  const chartAccount = readAccountingAccounts().find((item) => item.id === accountId);

  const account: DetailAccount | undefined = cashAccount
    ? {
        id: `cash__${cashAccount.id}`,
        code: cashAccount.phoneNumber,
        group: "assets",
        accountName: `${cashAccount.userName} Cash`,
        normalBalance: "Debit",
        status: "Active",
        description: `Cash-on-hand account for ${cashAccount.userName}`,
        createdAt: cashAccount.createdAt,
        updatedAt: cashAccount.updatedAt,
        balance: formatCurrency(cashAccount.currentBalance ?? 0, "INR"),
        currency: "INR",
        sourceType: "Cash",
        sourceId: cashAccount.id,
        sourceFields: [
          ["Holder", cashAccount.userName],
          ["Phone Number", cashAccount.phoneNumber],
          ["Account Source", "Cash Account Master"],
        ],
      }
    : bankAccount
      ? {
          id: `bank__${bankAccount.id}`,
          code: bankAccount.accountNumber,
          group: "assets",
          accountName: bankAccount.accountName,
          normalBalance: "Debit",
          status: "Active",
          description: `${bankAccount.accountType} asset account / ${bankAccount.accountNumber}`,
          createdAt: bankAccount.createdAt,
          updatedAt: bankAccount.updatedAt,
          balance: formatCurrency(bankAccount.currentBalance, bankAccount.currency),
          currency: bankAccount.currency,
          sourceType: "Bank",
          sourceId: bankAccount.id,
          sourceFields: [
            ["Bank Type", bankAccount.accountType],
            ["Account Number", bankAccount.accountNumber],
            ["Branch", bankAccount.branch],
            ["Reconciliation", bankAccount.reconciliationStatus],
          ],
        }
      : chartAccount
        ? { ...chartAccount, balance: formatCurrency(getJournalBalance(effectiveJournalEntries, chartAccount.id, chartAccount.normalBalance), "INR"), currency: "-" }
        : undefined;

  const logs = account ? effectiveJournalEntries.filter((entry) => entry.accountId === account.id) : [];
  const totalDebit = logs.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = logs.reduce((sum, entry) => sum + entry.credit, 0);
  const baseFields: Array<[string, string]> = account
    ? [
        ["Account Code", account.code],
        ["Account Group", groupLabels[account.group]],
        ["Normal Balance", account.normalBalance],
        ["Currency", account.currency],
        ["Status", account.status],
      ]
    : [];
  const systemFields: Array<[string, string]> = account
    ? [
        ["Created At", new Date(account.createdAt).toLocaleString()],
        ["Updated At", new Date(account.updatedAt).toLocaleString()],
        ["Account ID", account.id],
      ]
    : [];

  const logColumns: ColumnDef<AccountingJournalEntry>[] = [
    { accessorKey: "sourceType", header: "Type" },
    { accessorKey: "sourceReference", header: "Reference" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "party", header: "Party" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "debit", header: "Debit", cell: ({ row }) => (row.original.debit ? formatCurrency(row.original.debit, row.original.currency) : "-") },
    { accessorKey: "credit", header: "Credit", cell: ({ row }) => (row.original.credit ? formatCurrency(row.original.credit, row.original.currency) : "-") },
    { accessorKey: "narration", header: "Narration" },
  ];

  if (!account) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" to="/accountHeads">
          <ArrowLeft className="h-4 w-4" />
          Back to account heads
        </Link>
        <Card className="p-4 text-sm text-slate-500">Account not found.</Card>
      </div>
    );
  }

  const GroupIcon = groupIcons[account.group];
  const summaryItems = [
    { label: "Balance", value: account.balance, detail: account.group === "assets" ? "Current asset balance" : "Ledger balance", icon: GroupIcon },
    { label: "Group", value: groupLabels[account.group], detail: "Financial statement section", icon: GroupIcon },
    { label: "Debits", value: formatCurrency(totalDebit, account.currency === "-" ? "INR" : account.currency), detail: "Total debit movement", icon: GroupIcon },
    { label: "Credits", value: formatCurrency(totalCredit, account.currency === "-" ? "INR" : account.currency), detail: "Total credit movement", icon: GroupIcon },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Link className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" to="/accountHeads">
          <ArrowLeft className="h-4 w-4" />
          Back to account heads
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">{account.accountName}</h2>
            <p className="mt-1 text-sm text-slate-500">{account.code} / {groupLabels[account.group]}</p>
          </div>
          <StatusBadge status={account.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {summaryItems.map(({ label, value, detail, icon: Icon }) => (
          <Card className="p-3 sm:p-4" key={label}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 break-words text-base font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{value}</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{detail}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 sm:grid">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="hidden lg:block">
        <SummaryCards items={summaryItems} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader title="Ledger Profile" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {baseFields.map(([label, value]) => (
              <div className="rounded border border-slate-100 p-3 dark:border-slate-800" key={label}>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-4 text-sm dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500">Description</p>
            <p className="mt-1 text-slate-700 dark:text-slate-300">{account.description || "-"}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title={account.sourceType ? `${account.sourceType} Source` : "System Details"} />
          <div className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {[...(account.sourceFields ?? []), ...systemFields].map(([label, value]) => (
              <div className="flex flex-col gap-1 px-4 py-3" key={label}>
                <span className="text-xs font-medium text-slate-500">{label}</span>
                <span className="break-words font-semibold text-slate-900 dark:text-slate-100">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Ledger Transactions" />
        <DataTable data={logs} columns={logColumns} globalFilter="" />
      </Card>
    </div>
  );
}
