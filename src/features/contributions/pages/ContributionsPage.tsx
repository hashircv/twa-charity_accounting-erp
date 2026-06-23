import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { contributionFeature } from "@/store/features";
import { contributionSelectors } from "@/store/selectors";
import type { BaseEntity, Contribution } from "@/types/domain";
import { formatCurrency } from "@/utils/currency";
import { ContributionForm, type ContributionFormValues } from "@/features/contributions/components/ContributionForm";

export default function ContributionsPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const contributions = useAppSelector(contributionSelectors.selectAll);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [currency, setCurrency] = useState("");

  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [deletingContribution, setDeletingContribution] = useState<Contribution | null>(null);

  const filteredContributions = useMemo(
    () =>
      contributions.filter(
        (contribution) =>
          (!status || contribution.collectionStatus === status) &&
          (!type || contribution.contributionType === type) &&
          (!currency || contribution.amount.currency === currency),
      ),
    [contributions, currency, status, type],
  );

  const handleCreate = (values: ContributionFormValues) => {
    void dispatch(contributionFeature.createOne(values as Omit<Contribution, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Record created", description: `${values.caseReferenceNumber} was added to the register.` });
    setIsCreating(false);
  };

  const handleEdit = (values: ContributionFormValues) => {
    if (!editingContribution) return;
    void dispatch(contributionFeature.updateOne({ id: editingContribution.id, patch: values as Partial<Contribution> }) as never);
    notify({ tone: "success", title: "Record updated", description: `${values.caseReferenceNumber} changes were saved.` });
    setEditingContribution(null);
  };

  const handleDelete = () => {
    if (!deletingContribution) return;
    void dispatch(contributionFeature.deleteOne({ id: deletingContribution.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Record deleted", description: `${deletingContribution.caseReferenceNumber} was soft-deleted.` });
    setDeletingContribution(null);
  };

  const columns: ColumnDef<Contribution>[] = [
    { accessorKey: "caseReferenceNumber", header: "Case Ref" },
    { accessorKey: "contributorName", header: "Contributor" },
    { accessorKey: "contributorRole", header: "Role" },
    { accessorKey: "contributionType", header: "Type" },
    { accessorKey: "amount.convertedAmount", header: "INR", cell: ({ row }) => formatCurrency(row.original.amount.convertedAmount, "INR") },
    { accessorKey: "paymentMethod", header: "Method" },
    { accessorKey: "collectionStatus", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.collectionStatus} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="collections:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingContribution(row.original)}
              aria-label={`Edit ${row.original.caseReferenceNumber}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingContribution(row.original)}
              aria-label={`Delete ${row.original.caseReferenceNumber}`}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <ModulePage
      title="Contribution Management"
      description="Pledges, recurring contributions, case contribution summaries, and collection status."
      data={filteredContributions}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Pledged", "Received", "Overdue"]} />
          <SelectFilter label="Type" value={type} onChange={setType} options={["One-time", "Recurring"]} />
          <SelectFilter label="Currency" value={currency} onChange={setCurrency} options={["KWD", "INR"]} />
        </>
      }
    >
      <div className="flex justify-end">
        <PermissionGuard permission="collections:manage">
          <Button onClick={() => setIsCreating(true)} type="button">
            <CopyPlus className="h-4 w-4" />
            Create contribution
          </Button>
        </PermissionGuard>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal title="Create contribution" onClose={() => setIsCreating(false)}>
          <ContributionForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} submitLabel="Create" />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingContribution && (
        <Modal title={`Edit ${editingContribution.caseReferenceNumber}`} onClose={() => setEditingContribution(null)}>
          <ContributionForm
            defaultValues={{
              caseReferenceNumber: editingContribution.caseReferenceNumber,
              contributorName: editingContribution.contributorName,
              contributorRole: editingContribution.contributorRole,
              contributionType: editingContribution.contributionType,
              amount: editingContribution.amount,
              paymentMethod: editingContribution.paymentMethod,
              collectionStatus: editingContribution.collectionStatus,
              narration: editingContribution.narration,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingContribution(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingContribution && (
        <ConfirmationDialog
          title={`Delete ${deletingContribution.caseReferenceNumber}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingContribution(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
