import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Landmark, Pencil, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useToast } from "@/components/ui/Toaster";
import { BankAccountForm, type BankAccountFormValues } from "@/features/banks/components/BankAccountForm";
import { CashAccountForm, type CashAccountFormValues } from "@/features/banks/components/CashAccountForm";
import { accountingStorageKey, readAccountingAccounts } from "@/features/accounting/accountingAccounts";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { bankFeature, cashAccountFeature } from "@/store/features";
import { bankSelectors, cashAccountSelectors } from "@/store/selectors";
import type { BankAccount, BaseEntity, CashAccount } from "@/types/domain";

type AccountMasterRow =
  | {
      id: string;
      category: "Cash on Hand";
      name: string;
      number: string;
      type: "Cash Account";
      currency: "-";
      reconciliation: "-";
      cashAccount: CashAccount;
      bank?: never;
    }
  | {
      id: string;
      category: "Bank";
      name: string;
      number: string;
      type: BankAccount["accountType"];
      currency: BankAccount["currency"];
      reconciliation: BankAccount["reconciliationStatus"];
      bank: BankAccount;
      cashAccount?: never;
    };

export default function BanksPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const banks = useAppSelector(bankSelectors.selectAll);
  const cashAccounts = useAppSelector(cashAccountSelectors.selectAll);
  const [accountHeads, setAccountHeads] = useState(() => readAccountingAccounts());
  const [type, setType] = useState("");
  const [currency, setCurrency] = useState("");
  const [reconciliation, setReconciliation] = useState("");

  const [isCreatingBank, setIsCreatingBank] = useState(false);
  const [isCreatingCashAccount, setIsCreatingCashAccount] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deletingBank, setDeletingBank] = useState<BankAccount | null>(null);
  const [editingCashAccount, setEditingCashAccount] = useState<CashAccount | null>(null);
  const [deletingCashAccount, setDeletingCashAccount] = useState<CashAccount | null>(null);

  useEffect(() => {
    const syncAccounts = (event: StorageEvent) => {
      if (event.key === accountingStorageKey) setAccountHeads(readAccountingAccounts());
    };
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, []);

  const filteredBanks = useMemo(
    () =>
      banks.filter(
        (bank) =>
          (!type || bank.accountType === type) &&
          (!currency || bank.currency === currency) &&
          (!reconciliation || bank.reconciliationStatus === reconciliation),
      ),
    [banks, currency, reconciliation, type],
  );
  const assetAccountHeads = useMemo(
    () => accountHeads.filter((account) => account.group === "assets" && account.status === "Active"),
    [accountHeads],
  );
  const assetHeadOptions = useMemo(
    () => assetAccountHeads.map((account) => ({ id: account.id, name: account.accountName, code: account.code })),
    [assetAccountHeads],
  );

  const accountMasterRows = useMemo<AccountMasterRow[]>(
    () => [
      ...cashAccounts.map((account) => ({
        id: account.id,
        category: "Cash on Hand" as const,
        name: account.userName,
        number: account.phoneNumber,
        type: "Cash Account" as const,
        currency: "-" as const,
        reconciliation: "-" as const,
        cashAccount: account,
      })),
      ...filteredBanks.map((bank) => ({
        id: bank.id,
        category: "Bank" as const,
        name: bank.accountName,
        number: bank.accountNumber,
        type: bank.accountType,
        currency: bank.currency,
        reconciliation: bank.reconciliationStatus,
        bank,
      })),
    ],
    [cashAccounts, filteredBanks],
  );

  const handleCreateBank = (values: BankAccountFormValues) => {
    const { assetHeadId: _assetHeadId, ...payload } = values;
    void dispatch(bankFeature.createOne(payload as Omit<BankAccount, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Bank account created", description: `${values.accountName} was added to the account master.` });
    setIsCreatingBank(false);
  };

  const handleCreateCashAccount = (values: CashAccountFormValues) => {
    const { assetHeadId: _assetHeadId, ...payload } = values;
    void dispatch(cashAccountFeature.createOne({ ...payload, currentBalance: 0 } as Omit<CashAccount, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Cash account created", description: `${values.userName} was added to the account master.` });
    setIsCreatingCashAccount(false);
  };

  const handleEdit = (values: BankAccountFormValues) => {
    if (!editingBank) return;
    const { assetHeadId: _assetHeadId, ...payload } = values;
    void dispatch(bankFeature.updateOne({ id: editingBank.id, patch: payload as Partial<BankAccount> }) as never);
    notify({ tone: "success", title: "Bank account updated", description: `${values.accountName} changes were saved.` });
    setEditingBank(null);
  };

  const handleEditCashAccount = (values: CashAccountFormValues) => {
    if (!editingCashAccount) return;
    const { assetHeadId: _assetHeadId, ...payload } = values;
    void dispatch(cashAccountFeature.updateOne({ id: editingCashAccount.id, patch: payload as Partial<CashAccount> }) as never);
    notify({ tone: "success", title: "Cash account updated", description: `${values.userName} changes were saved.` });
    setEditingCashAccount(null);
  };

  const handleDeleteBank = () => {
    if (!deletingBank) return;
    void dispatch(bankFeature.deleteOne({ id: deletingBank.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Bank account deleted", description: `${deletingBank.accountName} was soft-deleted.` });
    setDeletingBank(null);
  };

  const handleDeleteCashAccount = () => {
    if (!deletingCashAccount) return;
    void dispatch(cashAccountFeature.deleteOne({ id: deletingCashAccount.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Cash account deleted", description: `${deletingCashAccount.userName} was soft-deleted.` });
    setDeletingCashAccount(null);
  };

  const accountMasterColumns: ColumnDef<AccountMasterRow>[] = [
    { accessorKey: "category", header: "Account Category" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "number", header: "Phone / Account Number" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "currency", header: "Currency" },
    {
      accessorKey: "reconciliation",
      header: "Reconciliation",
      cell: ({ row }) => (row.original.category === "Bank" ? <StatusBadge status={row.original.reconciliation} /> : "-"),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <PermissionGuard permission="custody:manage">
            <div className="flex gap-2">
              <button
                className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
                onClick={() => {
                  if (row.original.category === "Bank") {
                    setEditingBank(row.original.bank);
                    return;
                  }
                  setEditingCashAccount(row.original.cashAccount);
                }}
                aria-label={`Edit ${row.original.name}`}
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
                onClick={() => {
                  if (row.original.category === "Bank") {
                    setDeletingBank(row.original.bank);
                    return;
                  }
                  setDeletingCashAccount(row.original.cashAccount);
                }}
                aria-label={`Delete ${row.original.name}`}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </PermissionGuard>
        );
      },
    },
  ];

  return (
    <ModulePage
      title="Account Masters"
      description="Maintain cash-on-hand users and bank accounts in one master list."
      data={accountMasterRows}
      columns={accountMasterColumns}
      filterSlot={
        <>
          <SelectFilter label="Bank Type" value={type} onChange={setType} options={["Kuwait Bank", "India Bank"]} />
          <SelectFilter label="Currency" value={currency} onChange={setCurrency} options={["KWD", "INR"]} />
          <SelectFilter label="Reconciliation" value={reconciliation} onChange={setReconciliation} options={["Matched", "Pending"]} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {[
          { label: "Cash Accounts", value: String(cashAccounts.length), detail: "Cash-on-hand masters", icon: WalletCards },
          { label: "Bank Accounts", value: String(banks.length), detail: "Bank account masters", icon: Landmark },
          { label: "Kuwait Banks", value: String(banks.filter((bank) => bank.accountType === "Kuwait Bank").length), detail: "KWD account masters", icon: Landmark },
          { label: "India Banks", value: String(banks.filter((bank) => bank.accountType === "India Bank").length), detail: "INR account masters", icon: Landmark },
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
            { label: "Cash Accounts", value: String(cashAccounts.length), detail: "Cash-on-hand masters", icon: WalletCards },
            { label: "Bank Accounts", value: String(banks.length), detail: "Bank account masters", icon: Landmark },
            { label: "Kuwait Banks", value: String(banks.filter((bank) => bank.accountType === "Kuwait Bank").length), detail: "KWD account masters", icon: Landmark },
            { label: "India Banks", value: String(banks.filter((bank) => bank.accountType === "India Bank").length), detail: "INR account masters", icon: Landmark },
          ]}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <PermissionGuard permission="custody:manage">
          <Button className="bg-slate-700 hover:bg-slate-800" onClick={() => setIsCreatingCashAccount(true)} type="button">
            <WalletCards className="h-4 w-4" />
            Create cash account
          </Button>
          <Button onClick={() => setIsCreatingBank(true)} type="button">
            <CopyPlus className="h-4 w-4" />
            Create bank account
          </Button>
        </PermissionGuard>
      </div>

      {isCreatingBank && (
        <Modal title="Create bank account" onClose={() => setIsCreatingBank(false)}>
          <BankAccountForm
            assetAccountHeads={assetHeadOptions}
            onSubmit={handleCreateBank}
            onCancel={() => setIsCreatingBank(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {isCreatingCashAccount && (
        <Modal title="Create cash account" onClose={() => setIsCreatingCashAccount(false)}>
          <CashAccountForm
            assetAccountHeads={assetHeadOptions}
            onSubmit={handleCreateCashAccount}
            onCancel={() => setIsCreatingCashAccount(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editingBank && (
        <Modal title={`Edit ${editingBank.accountName}`} onClose={() => setEditingBank(null)}>
          <BankAccountForm
            assetAccountHeads={assetHeadOptions}
            defaultValues={{
              accountName: editingBank.accountName,
              accountNumber: editingBank.accountNumber,
              accountType: editingBank.accountType,
              currency: editingBank.currency,
              branch: editingBank.branch,
              openingBalance: editingBank.openingBalance,
              currentBalance: editingBank.currentBalance,
              reconciliationStatus: editingBank.reconciliationStatus,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingBank(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {editingCashAccount && (
        <Modal title={`Edit ${editingCashAccount.userName}`} onClose={() => setEditingCashAccount(null)}>
          <CashAccountForm
            assetAccountHeads={assetHeadOptions}
            defaultValues={{
              userName: editingCashAccount.userName,
              phoneNumber: editingCashAccount.phoneNumber,
            }}
            onSubmit={handleEditCashAccount}
            onCancel={() => setEditingCashAccount(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {deletingBank && (
        <ConfirmationDialog
          title={`Delete ${deletingBank.accountName}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingBank(null)}
          onConfirm={handleDeleteBank}
        />
      )}

      {deletingCashAccount && (
        <ConfirmationDialog
          title={`Delete ${deletingCashAccount.userName}?`}
          description="This will soft-delete the cash account master while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingCashAccount(null)}
          onConfirm={handleDeleteCashAccount}
        />
      )}
    </ModulePage>
  );
}
