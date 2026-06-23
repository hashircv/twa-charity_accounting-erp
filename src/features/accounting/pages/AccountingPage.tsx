import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, CircleDollarSign, CopyPlus, Eye, Pencil, Scale, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useToast } from "@/components/ui/Toaster";
import { useAppSelector } from "@/hooks/redux";
import {
  accountGroups,
  accountingStorageKey,
  accountingJournalStorageKey,
  type AccountingAccount,
  type AccountGroup,
  buildPaymentJournalEntries,
  buildReceiptJournalEntries,
  getDefaultAccountId,
  getJournalBalance,
  groupCodePrefix,
  groupLabels,
  mergeAccountingJournal,
  normalBalanceByGroup,
  readAccountingJournal,
  readAccountingAccounts,
  writeAccountingAccounts,
  type AccountingJournalEntry,
} from "@/features/accounting/accountingAccounts";
import { readUserAccounts, userAccountsStorageKey, type UserAccount } from "@/features/users/userAccountsStore";
import { bankSelectors, cashAccountSelectors, collectionSelectors, memberSelectors, paymentSelectors } from "@/store/selectors";
import { formatCurrency } from "@/utils/currency";

type AccountingRow = AccountingAccount & {
  balance: string;
  sourceType?: "Cash" | "Bank";
  sourceId?: string;
  managedExternally?: boolean;
};

const accountSchema = z.object({
  codeSuffix: z.coerce.number().min(1, "Code suffix is required"),
  group: z.enum(["assets", "liabilities", "income", "expenses"], { required_error: "Select group" }),
  accountName: z.string().min(2, "Account name must be at least 2 characters"),
  normalBalance: z.enum(["Debit", "Credit"], { required_error: "Select normal balance" }),
  status: z.enum(["Active", "Inactive"], { required_error: "Select status" }),
  description: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

function getCodeSuffix(code: string) {
  return Number(code.split("-")[1] ?? 1);
}

function getAccountCode(group: AccountGroup, codeSuffix: number) {
  return `${groupCodePrefix[group]}-${String(codeSuffix).padStart(3, "0")}`;
}

function AccountForm({
  assetAccountNameOptions,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  assetAccountNameOptions?: string[];
  defaultValues?: Partial<AccountFormValues>;
  onSubmit: (values: AccountFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      codeSuffix: 1,
      group: "assets",
      accountName: "",
      normalBalance: "Debit",
      status: "Active",
      description: "",
      ...defaultValues,
    },
  });
  const group = watch("group");
  const codeSuffix = watch("codeSuffix");

  useEffect(() => {
    setValue("normalBalance", normalBalanceByGroup[group], { shouldValidate: true });
  }, [group, setValue]);

  const accountNameOptions = useMemo(() => {
    const options = assetAccountNameOptions ?? [];
    if (defaultValues?.accountName && !options.includes(defaultValues.accountName)) {
      return [defaultValues.accountName, ...options];
    }
    return options;
  }, [assetAccountNameOptions, defaultValues?.accountName]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="group"
          label="Account Group"
          placeholder="Select group"
          error={errors.group?.message}
          options={accountGroups.map((item) => ({ value: item, label: groupLabels[item] }))}
          {...register("group")}
        />
        <NumberField
          id="codeSuffix"
          label={`Account Code / Account Number (${groupCodePrefix[group]}-${String(Number(codeSuffix) || 1).padStart(3, "0")})`}
          min="1"
          step="1"
          error={errors.codeSuffix?.message}
          {...register("codeSuffix")}
        />
      </div>

      {group === "assets" ? (
        <>
          <TextField
            id="accountName"
            label="Account Name"
            placeholder="Enter bank name or select cash user"
            error={errors.accountName?.message}
            list="asset-account-name-options"
            {...register("accountName")}
          />
          {accountNameOptions.length > 0 && (
            <datalist id="asset-account-name-options">
              {accountNameOptions.map((name) => (
                <option value={name} key={name} />
              ))}
            </datalist>
          )}
        </>
      ) : (
        <TextField
          id="accountName"
          label="Account Name"
          placeholder="e.g. Education Assistance"
          error={errors.accountName?.message}
          {...register("accountName")}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="normalBalance"
          label="Normal Balance"
          placeholder="Select balance"
          error={errors.normalBalance?.message}
          options={[
            { value: "Debit", label: "Debit" },
            { value: "Credit", label: "Credit" },
          ]}
          {...register("normalBalance")}
        />
        <SelectField
          id="status"
          label="Status"
          placeholder="Select status"
          error={errors.status?.message}
          options={[
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
          ]}
          {...register("status")}
        />
      </div>

      <TextField
        id="description"
        label="Description"
        placeholder="Optional account usage note"
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button className="bg-slate-600 hover:bg-slate-700" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function AccountingPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [accounts, setAccounts] = useState<AccountingAccount[]>(() => readAccountingAccounts());
  const [journalEntries, setJournalEntries] = useState<AccountingJournalEntry[]>(() => readAccountingJournal());
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const bankAccounts = useAppSelector(bankSelectors.selectAll);
  const members = useAppSelector(memberSelectors.selectAll);
  const collections = useAppSelector(collectionSelectors.selectAll);
  const payments = useAppSelector(paymentSelectors.selectAll);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => readUserAccounts());
  const [isCreating, setIsCreating] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountingAccount | null>(null);

  useEffect(() => {
    writeAccountingAccounts(accounts);
    window.dispatchEvent(new StorageEvent("storage", { key: accountingStorageKey }));
  }, [accounts]);

  useEffect(() => {
    const syncJournal = (event: StorageEvent) => {
      if (event.key === accountingJournalStorageKey) {
        setJournalEntries(readAccountingJournal());
      }
    };

    window.addEventListener("storage", syncJournal);
    return () => window.removeEventListener("storage", syncJournal);
  }, []);

  useEffect(() => {
    const syncUsers = (event: StorageEvent) => {
      if (event.key === userAccountsStorageKey) setUserAccounts(readUserAccounts());
    };

    window.addEventListener("storage", syncUsers);
    return () => window.removeEventListener("storage", syncUsers);
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

  const assetAccountNameOptions = useMemo(
    () => [
      ...new Set(
        userAccounts
          .map((account) => members.find((member) => member.id === account.memberId)?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ],
    [members, userAccounts],
  );

  const accountingRows = useMemo<AccountingRow[]>(
    () => [
      ...cashAccounts.map((account) => ({
        id: `cash__${account.id}`,
        code: account.phoneNumber,
        group: "assets" as const,
        accountName: `${account.userName} Cash`,
        normalBalance: "Debit" as const,
        status: "Active" as const,
        description: `Cash-on-hand account for ${account.userName}`,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        balance: formatCurrency(account.currentBalance ?? 0, "INR"),
        sourceType: "Cash" as const,
        sourceId: account.id,
        managedExternally: true,
      })),
      ...bankAccounts.map((bank) => ({
        id: `bank__${bank.id}`,
        code: bank.accountNumber,
        group: "assets" as const,
        accountName: bank.accountName,
        normalBalance: "Debit" as const,
        status: "Active" as const,
        description: `${bank.accountType} asset account`,
        createdAt: bank.createdAt,
        updatedAt: bank.updatedAt,
        balance: formatCurrency(bank.currentBalance, bank.currency),
        sourceType: "Bank" as const,
        sourceId: bank.id,
        managedExternally: true,
      })),
      ...accounts.map((account) => ({
        ...account,
        balance: formatCurrency(getJournalBalance(effectiveJournalEntries, account.id, account.normalBalance), "INR"),
      })),
    ],
    [accounts, bankAccounts, cashAccounts, effectiveJournalEntries],
  );

  const filteredRows = useMemo(
    () => accountingRows.filter((row) => (!group || groupLabels[row.group] === group) && (!status || row.status === status)),
    [accountingRows, group, status],
  );

  const totals = useMemo(
    () => ({
      assets: accountingRows.filter((item) => item.group === "assets" && item.status === "Active").length,
      liabilities: accountingRows.filter((item) => item.group === "liabilities" && item.status === "Active").length,
      income: accountingRows.filter((item) => item.group === "income" && item.status === "Active").length,
      expenses: accountingRows.filter((item) => item.group === "expenses" && item.status === "Active").length,
    }),
    [accountingRows],
  );

  const createAccount = (values: AccountFormValues) => {
    const code = getAccountCode(values.group, values.codeSuffix);
    const accountId = getDefaultAccountId(values.group, values.accountName);
    if (accounts.some((account) => account.code === code)) {
      notify({ tone: "error", title: "Duplicate account code", description: `${code} already exists.` });
      return;
    }
    if (accounts.some((account) => account.id === accountId)) {
      notify({ tone: "error", title: "Duplicate account name", description: `${values.accountName} already exists in ${groupLabels[values.group]}.` });
      return;
    }

    const now = new Date().toISOString();
    setAccounts((current) => [
      {
        id: accountId,
        code,
        group: values.group,
        accountName: values.accountName,
        normalBalance: values.normalBalance,
        status: values.status,
        description: values.description ?? "",
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);
    notify({ tone: "success", title: "Account created", description: `${values.accountName} was added.` });
    setIsCreating(false);
  };

  const updateAccount = (values: AccountFormValues) => {
    if (!editingAccount) return;
    const code = getAccountCode(values.group, values.codeSuffix);
    if (accounts.some((account) => account.id !== editingAccount.id && account.code === code)) {
      notify({ tone: "error", title: "Duplicate account code", description: `${code} already exists.` });
      return;
    }

    setAccounts((current) =>
      current.map((account) =>
        account.id === editingAccount.id
          ? {
              ...account,
              code,
              group: values.group,
              accountName: values.accountName,
              normalBalance: values.normalBalance,
              status: values.status,
              description: values.description ?? "",
              updatedAt: new Date().toISOString(),
            }
          : account,
      ),
    );
    notify({ tone: "success", title: "Account updated", description: `${values.accountName} changes were saved.` });
    setEditingAccount(null);
  };

  const deleteAccount = () => {
    if (!deletingAccount) return;
    setAccounts((current) => current.filter((account) => account.id !== deletingAccount.id));
    notify({ tone: "success", title: "Account deleted", description: `${deletingAccount.accountName} was removed.` });
    setDeletingAccount(null);
  };

  const columns: ColumnDef<AccountingRow>[] = [
    { accessorKey: "code", header: "Account Code" },
    { accessorKey: "accountName", header: "Account Name" },
    { accessorKey: "group", header: "Group", cell: ({ row }) => groupLabels[row.original.group] },
    { accessorKey: "balance", header: "Balance" },
    { accessorKey: "normalBalance", header: "Normal Balance" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
            onClick={() => navigate(`/accountHeads/${row.original.id}`)}
            aria-label={`View ${row.original.accountName}`}
            type="button"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
            onClick={() => setEditingAccount(row.original)}
            disabled={row.original.managedExternally}
            aria-label={`Edit ${row.original.accountName}`}
            type="button"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
            onClick={() => setDeletingAccount(row.original)}
            disabled={row.original.managedExternally}
            aria-label={`Delete ${row.original.accountName}`}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <ModulePage
      title="Accounting"
      description="Create and maintain the chart of accounts used for receipts, payments, commitments, cash, and bank balances."
      data={filteredRows}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Group" value={group} onChange={setGroup} options={Object.values(groupLabels)} />
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Active", "Inactive"]} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {[
          { label: "Asset Accounts", value: String(totals.assets), detail: "Active asset accounts", icon: WalletCards },
          { label: "Liability Accounts", value: String(totals.liabilities), detail: "Active liability accounts", icon: Scale },
          { label: "Income Accounts", value: String(totals.income), detail: "Active income accounts", icon: CircleDollarSign },
          { label: "Expense Accounts", value: String(totals.expenses), detail: "Active expense accounts", icon: BookOpen },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card className="p-3 sm:p-4" key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-2 break-words text-base font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">{item.detail}</p>
                </div>
                <div className="hidden h-9 w-9 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 sm:grid">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="hidden lg:block">
        <SummaryCards
          items={[
            { label: "Asset Accounts", value: String(totals.assets), detail: "Active asset accounts", icon: WalletCards },
            { label: "Liability Accounts", value: String(totals.liabilities), detail: "Active liability accounts", icon: Scale },
            { label: "Income Accounts", value: String(totals.income), detail: "Active income accounts", icon: CircleDollarSign },
            { label: "Expense Accounts", value: String(totals.expenses), detail: "Active expense accounts", icon: BookOpen },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => setIsCreating(true)} type="button">
          <CopyPlus className="h-4 w-4" />
          Create account
        </Button>
      </div>

      {isCreating && (
        <Modal title="Create account" onClose={() => setIsCreating(false)}>
          <AccountForm
            assetAccountNameOptions={assetAccountNameOptions}
            onSubmit={createAccount}
            onCancel={() => setIsCreating(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editingAccount && (
        <Modal title={`Edit ${editingAccount.accountName}`} onClose={() => setEditingAccount(null)}>
          <AccountForm
            assetAccountNameOptions={assetAccountNameOptions}
            defaultValues={{
              codeSuffix: getCodeSuffix(editingAccount.code),
              group: editingAccount.group,
              accountName: editingAccount.accountName,
              normalBalance: editingAccount.normalBalance,
              status: editingAccount.status,
              description: editingAccount.description,
            }}
            onSubmit={updateAccount}
            onCancel={() => setEditingAccount(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {deletingAccount && (
        <ConfirmationDialog
          title={`Delete ${deletingAccount.accountName}?`}
          description="This will remove the account from the active chart of accounts."
          confirmLabel="Delete"
          onCancel={() => setDeletingAccount(null)}
          onConfirm={deleteAccount}
        />
      )}
    </ModulePage>
  );
}
