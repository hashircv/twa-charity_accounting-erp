import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, CopyPlus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { SelectControl } from "@/components/forms/FormField";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { bankFeature, cashAccountFeature } from "@/store/features";
import { bankSelectors, cashAccountSelectors } from "@/store/selectors";
import type { BankAccount, CashAccount, Currency } from "@/types/domain";
import { exchangeRates } from "@/services/mock/mockData";
import {
  replaceJournalEntriesForSource,
  type AccountingJournalEntry,
} from "@/features/accounting/accountingAccounts";
import { convertCurrency, formatCurrency } from "@/utils/currency";

type InterchangeDirection = "Cash to Bank" | "Bank to Cash";

interface InterchangeTransaction {
  id: string;
  date: string;
  direction: InterchangeDirection;
  cashAccountName: string;
  bankAccountName: string;
  currency: Currency;
  amount: number;
  narration: string;
}

export default function InterchangePage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const banks = useAppSelector(bankSelectors.selectAll);
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const [direction, setDirection] = useState<InterchangeDirection>("Cash to Bank");
  const [cashAccountId, setCashAccountId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [transactions, setTransactions] = useState<InterchangeTransaction[]>([]);

  const selectedBank = banks.find((bank) => bank.id === bankAccountId);
  const selectedCashAccount = cashAccounts.find((account) => account.id === cashAccountId);
  const transferCurrency = selectedBank?.currency ?? "INR";

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => !directionFilter || transaction.direction === directionFilter),
    [directionFilter, transactions],
  );

  const handleRecord = () => {
    const bank = banks.find((item) => item.id === bankAccountId);
    const cashAccount = cashAccounts.find((item) => item.id === cashAccountId);
    const transferAmount = Number(amount);

    if (!cashAccount || !bank || !Number.isFinite(transferAmount) || transferAmount <= 0) {
      notify({ tone: "error", title: "Interchange not saved", description: "Select cash account, bank account, and valid amount." });
      return;
    }

    if (direction === "Bank to Cash" && transferAmount > bank.currentBalance) {
      notify({ tone: "error", title: "Insufficient bank balance", description: `${bank.accountName} does not have enough funds.` });
      return;
    }

    const now = new Date().toISOString();
    const reference = `INT-${String(transactions.length + 1).padStart(6, "0")}`;
    const cashAmount = convertCurrency(transferAmount, bank.currency, now, exchangeRates).convertedAmount;
    const signedBankAmount = direction === "Cash to Bank" ? transferAmount : -transferAmount;
    const signedCashAmount = direction === "Cash to Bank" ? -cashAmount : cashAmount;
    const bankAccountName = `${bank.accountName} / ${bank.accountNumber}`;
    const cashAccountName = `${cashAccount.userName} / ${cashAccount.phoneNumber}`;
    const transferNarration = narration || `${direction}: ${cashAccount.userName} / ${bank.accountName}`;

    void dispatch(
      bankFeature.updateOne({
        id: bank.id,
        patch: { currentBalance: Number((bank.currentBalance + signedBankAmount).toFixed(3)) },
      }) as never,
    );
    void dispatch(
      cashAccountFeature.updateOne({
        id: cashAccount.id,
        patch: { currentBalance: Number((cashAccount.currentBalance + signedCashAmount).toFixed(3)) },
      }) as never,
    );

    const entries: AccountingJournalEntry[] =
      direction === "Cash to Bank"
        ? [
            {
              id: `${reference}-bank-debit`,
              sourceType: "Interchange",
              sourceReference: reference,
              date: now,
              accountId: `bank__${bank.id}`,
              accountName: bankAccountName,
              group: "assets",
              debit: transferAmount,
              credit: 0,
              currency: bank.currency,
              party: cashAccount.userName,
              category: "Cash to Bank",
              narration: transferNarration,
            },
            {
              id: `${reference}-cash-credit`,
              sourceType: "Interchange",
              sourceReference: reference,
              date: now,
              accountId: `cash__${cashAccount.id}`,
              accountName: cashAccountName,
              group: "assets",
              debit: 0,
              credit: cashAmount,
              currency: "INR",
              party: bank.accountName,
              category: "Cash to Bank",
              narration: transferNarration,
            },
          ]
        : [
            {
              id: `${reference}-cash-debit`,
              sourceType: "Interchange",
              sourceReference: reference,
              date: now,
              accountId: `cash__${cashAccount.id}`,
              accountName: cashAccountName,
              group: "assets",
              debit: cashAmount,
              credit: 0,
              currency: "INR",
              party: bank.accountName,
              category: "Bank to Cash",
              narration: transferNarration,
            },
            {
              id: `${reference}-bank-credit`,
              sourceType: "Interchange",
              sourceReference: reference,
              date: now,
              accountId: `bank__${bank.id}`,
              accountName: bankAccountName,
              group: "assets",
              debit: 0,
              credit: transferAmount,
              currency: bank.currency,
              party: cashAccount.userName,
              category: "Bank to Cash",
              narration: transferNarration,
            },
          ];
    replaceJournalEntriesForSource("Interchange", reference, entries);

    setTransactions((current) => [
      {
        id: reference,
        date: now,
        direction,
        cashAccountName: cashAccount.userName,
        bankAccountName: bank.accountName,
        currency: bank.currency,
        amount: transferAmount,
        narration: transferNarration,
      },
      ...current,
    ]);

    notify({
      tone: "success",
      title: "Interchange recorded",
      description:
        direction === "Cash to Bank"
          ? `${formatCurrency(transferAmount, bank.currency)} moved from ${cashAccount.userName} to ${bank.accountName}.`
          : `${formatCurrency(transferAmount, bank.currency)} moved from ${bank.accountName} to ${cashAccount.userName}.`,
    });

    setAmount("");
    setNarration("");
    setIsCreating(false);
  };

  const columns: ColumnDef<InterchangeTransaction>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "direction", header: "Direction" },
    { accessorKey: "cashAccountName", header: "Cash Account" },
    { accessorKey: "bankAccountName", header: "Bank Account" },
    { accessorKey: "currency", header: "Currency" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency) },
    { accessorKey: "narration", header: "Narration" },
  ];

  return (
    <ModulePage
      title="Interchange"
      description="Record fund movements between cash accounts and bank accounts."
      data={filteredTransactions}
      columns={columns}
      filterSlot={
        <SelectFilter
          label="Direction"
          value={directionFilter}
          onChange={setDirectionFilter}
          options={["Cash to Bank", "Bank to Cash"]}
        />
      }
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
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Direction</span>
                <SelectControl
                  options={[
                    { value: "Cash to Bank", label: "Cash to Bank" },
                    { value: "Bank to Cash", label: "Bank to Cash" },
                  ]}
                  value={direction}
                  onChange={(event) => setDirection(event.target.value as InterchangeDirection)}
                />
              </label>

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Amount ({transferCurrency})</span>
                <input
                  className="h-11 w-full rounded border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 sm:h-10 sm:text-sm"
                  min="0"
                  step={transferCurrency === "KWD" ? "0.001" : "1"}
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {direction === "Bank to Cash" && (
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Bank Account</span>
                  <SelectControl
                    placeholder="Select bank account"
                    options={banks.map((bank: BankAccount) => ({
                      value: bank.id,
                      label: `${bank.accountName} (${bank.currency})`,
                    }))}
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                  />
                </label>
              )}

              <label className="space-y-1">
                <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Cash Account</span>
                <SelectControl
                  placeholder="Select cash account"
                  options={cashAccounts.map((account: CashAccount) => ({
                    value: account.id,
                    label: `${account.userName} - ${account.phoneNumber}`,
                  }))}
                  value={cashAccountId}
                  onChange={(event) => setCashAccountId(event.target.value)}
                />
              </label>

              {direction === "Cash to Bank" && (
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Bank Account</span>
                  <SelectControl
                    placeholder="Select bank account"
                    options={banks.map((bank: BankAccount) => ({
                      value: bank.id,
                      label: `${bank.accountName} (${bank.currency})`,
                    }))}
                    value={bankAccountId}
                    onChange={(event) => setBankAccountId(event.target.value)}
                  />
                </label>
              )}
            </div>

            <label className="block space-y-1">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">Narration</span>
              <input
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900"
                placeholder={
                  selectedCashAccount && selectedBank
                    ? `${direction}: ${selectedCashAccount.userName} / ${selectedBank.accountName}`
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
