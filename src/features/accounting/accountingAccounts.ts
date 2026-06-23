import { chartOfAccounts } from "@/utils/chartOfAccounts";
import type { BankAccount, CashAccount, Collection, Currency, Payment } from "@/types/domain";

export type AccountGroup = keyof typeof chartOfAccounts;

export interface AccountingAccount {
  id: string;
  code: string;
  group: AccountGroup;
  accountName: string;
  normalBalance: "Debit" | "Credit";
  status: "Active" | "Inactive";
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingJournalEntry {
  id: string;
  sourceType: "Receipt" | "Payment" | "Interchange";
  sourceReference: string;
  date: string;
  accountId: string;
  accountName: string;
  group: AccountGroup;
  debit: number;
  credit: number;
  currency: Currency;
  party: string;
  category: string;
  narration: string;
}

export const accountingStorageKey = "twa-accounting-accounts";
export const accountingJournalStorageKey = "twa-accounting-journal";

export const groupLabels: Record<AccountGroup, string> = {
  assets: "Assets",
  liabilities: "Liabilities",
  income: "Income",
  expenses: "Expenses",
};

export const groupCodePrefix: Record<AccountGroup, string> = {
  assets: "1000",
  liabilities: "2000",
  income: "4000",
  expenses: "5000",
};

export const normalBalanceByGroup: Record<AccountGroup, AccountingAccount["normalBalance"]> = {
  assets: "Debit",
  liabilities: "Credit",
  income: "Credit",
  expenses: "Debit",
};

export const accountGroups = Object.keys(groupLabels) as AccountGroup[];

export function createInitialAccountingAccounts(): AccountingAccount[] {
  return (Object.entries(chartOfAccounts) as [AccountGroup, readonly string[]][]).flatMap(([accountGroup, accounts]) =>
    accounts.map((accountName, index) => {
      const now = new Date().toISOString();
      return {
        id: `${accountGroup}-${accountName.toLowerCase().replace(/\s+/g, "-")}`,
        code: `${groupCodePrefix[accountGroup]}-${String(index + 1).padStart(3, "0")}`,
        group: accountGroup,
        accountName,
        normalBalance: normalBalanceByGroup[accountGroup],
        status: "Active",
        description: `${groupLabels[accountGroup]} ledger account`,
        createdAt: now,
        updatedAt: now,
      };
    }),
  );
}

export function readAccountingAccounts() {
  const fallback = createInitialAccountingAccounts();
  const stored = localStorage.getItem(accountingStorageKey);
  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored) as AccountingAccount[];
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeAccountingAccounts(accounts: AccountingAccount[]) {
  localStorage.setItem(accountingStorageKey, JSON.stringify(accounts));
}

export function getDefaultAccountId(group: AccountGroup, accountName: string) {
  return `${group}-${accountName.toLowerCase().replace(/\s+/g, "-")}`;
}

export function getReceiptIncomeAccount(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("membership") || normalized.includes("subscription")) return "Member Subscription";
  if (normalized.includes("ramadan")) return "Ramadan Collection";
  if (normalized.includes("general") || normalized.includes("charity") || normalized.includes("coin")) return "General Collection";
  if (normalized.includes("interest")) return "Bank Interest";
  if (normalized.includes("chitty")) return "Chitty Income";
  return "Other Income";
}

export function getPaymentExpenseAccount(category: string) {
  const normalized = category.toLowerCase();
  const matches: Array<[string, string]> = [
    ["food", "Food Kit"],
    ["medical emergency", "Medical Emergency"],
    ["medical", "Medical Aid"],
    ["widow", "Widow Pension"],
    ["employment", "Self Employment"],
    ["education", "Education"],
    ["debt", "Debt Clearance"],
    ["house", "House Maintenance"],
    ["dialysis", "Dialysis Assistance"],
    ["ramadan", "Ramadan Kit"],
    ["eid", "Eid Kit"],
    ["admin", "Admin Expenses"],
  ];
  return matches.find(([needle]) => normalized.includes(needle))?.[1] ?? "Payment Disbursement";
}

export function readAccountingJournal() {
  const stored = localStorage.getItem(accountingJournalStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as AccountingJournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAccountingJournal(entries: AccountingJournalEntry[]) {
  localStorage.setItem(accountingJournalStorageKey, JSON.stringify(entries));
  window.dispatchEvent(new StorageEvent("storage", { key: accountingJournalStorageKey }));
}

export function replaceJournalEntriesForSource(
  sourceType: AccountingJournalEntry["sourceType"],
  sourceReference: string,
  entries: AccountingJournalEntry[],
) {
  const current = readAccountingJournal().filter(
    (entry) => entry.sourceType !== sourceType || entry.sourceReference !== sourceReference,
  );
  writeAccountingJournal([...entries, ...current]);
}

export function removeJournalEntriesForSource(sourceType: AccountingJournalEntry["sourceType"], sourceReference: string) {
  writeAccountingJournal(
    readAccountingJournal().filter((entry) => entry.sourceType !== sourceType || entry.sourceReference !== sourceReference),
  );
}

export function getJournalBalance(
  entries: AccountingJournalEntry[],
  accountId: string,
  normalBalance: AccountingAccount["normalBalance"],
) {
  const total = entries
    .filter((entry) => entry.accountId === accountId)
    .reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
  return normalBalance === "Debit" ? total : -total;
}

function getReceiptBalanceImpact(collection: Collection, bankAccounts: BankAccount[]) {
  if (collection.accountType === "Bank") {
    const bank = bankAccounts.find((account) => account.id === collection.accountId);
    if (!bank) return collection.amount.convertedAmount;
    return bank.currency === collection.amount.currency ? collection.amount.originalAmount : collection.amount.convertedAmount;
  }
  return collection.amount.convertedAmount;
}

function getPaymentAccountId(payment: Payment, bankAccounts: BankAccount[], cashAccounts: CashAccount[]) {
  if (payment.accountId) return payment.accountId;
  return payment.method === "Bank" ? bankAccounts[0]?.id ?? "" : cashAccounts[0]?.id ?? "";
}

function getPaymentAccountName(payment: Payment, bankAccounts: BankAccount[], cashAccounts: CashAccount[]) {
  if (payment.accountName) return payment.accountName;
  if (payment.method === "Bank") {
    const bank = bankAccounts.find((account) => account.id === getPaymentAccountId(payment, bankAccounts, cashAccounts));
    return bank ? `${bank.accountName} / ${bank.accountNumber}` : "";
  }
  const cashAccount = cashAccounts.find((account) => account.id === getPaymentAccountId(payment, bankAccounts, cashAccounts));
  return cashAccount ? `${cashAccount.userName} / ${cashAccount.phoneNumber}` : "";
}

function getPaymentBalanceImpact(payment: Payment, bankAccounts: BankAccount[]) {
  if (payment.method === "Bank") {
    const bank = bankAccounts.find((account) => account.id === payment.accountId);
    if (!bank) return payment.amount.convertedAmount;
    return bank.currency === payment.amount.currency ? payment.amount.originalAmount : payment.amount.convertedAmount;
  }
  return payment.amount.convertedAmount;
}

export function buildReceiptJournalEntries(collection: Collection, bankAccounts: BankAccount[]): AccountingJournalEntry[] {
  const assetAccountId = `${collection.accountType === "Bank" ? "bank" : "cash"}__${collection.accountId}`;
  const incomeAccountName = getReceiptIncomeAccount(collection.category);
  const assetAmount = getReceiptBalanceImpact(collection, bankAccounts);

  return [
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
      accountId: getDefaultAccountId("income", incomeAccountName),
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
}

export function buildPaymentJournalEntries(
  payment: Payment,
  bankAccounts: BankAccount[],
  cashAccounts: CashAccount[],
): AccountingJournalEntry[] {
  const accountId = getPaymentAccountId(payment, bankAccounts, cashAccounts);
  const assetAccountId = `${payment.method === "Bank" ? "bank" : "cash"}__${accountId}`;
  const expenseAccountName = getPaymentExpenseAccount(payment.category);
  const paymentWithAccount = { ...payment, accountId };
  const assetAmount = getPaymentBalanceImpact(paymentWithAccount, bankAccounts);

  return [
    {
      id: `payment-${payment.voucherNumber}-expense`,
      sourceType: "Payment",
      sourceReference: payment.voucherNumber,
      date: payment.date,
      accountId: getDefaultAccountId("expenses", expenseAccountName),
      accountName: expenseAccountName,
      group: "expenses",
      debit: payment.amount.convertedAmount,
      credit: 0,
      currency: "INR",
      party: payment.beneficiaryId,
      category: payment.category,
      narration: payment.narration,
    },
    {
      id: `payment-${payment.voucherNumber}-asset`,
      sourceType: "Payment",
      sourceReference: payment.voucherNumber,
      date: payment.date,
      accountId: assetAccountId,
      accountName: getPaymentAccountName(paymentWithAccount, bankAccounts, cashAccounts),
      group: "assets",
      debit: 0,
      credit: assetAmount,
      currency: payment.method === "Bank" ? (bankAccounts.find((account) => account.id === accountId)?.currency ?? "INR") : "INR",
      party: payment.beneficiaryId,
      category: payment.category,
      narration: payment.narration,
    },
  ];
}

export function mergeAccountingJournal(
  storedEntries: AccountingJournalEntry[],
  derivedEntries: AccountingJournalEntry[],
) {
  const storedSources = new Set(storedEntries.map((entry) => `${entry.sourceType}:${entry.sourceReference}`));
  return [
    ...storedEntries,
    ...derivedEntries.filter((entry) => !storedSources.has(`${entry.sourceType}:${entry.sourceReference}`)),
  ];
}
