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
import { commitmentFeature } from "@/store/features";
import { commitmentSelectors } from "@/store/selectors";
import type { BaseEntity, Commitment } from "@/types/domain";
import { formatCurrency } from "@/utils/currency";
import { CommitmentForm, type CommitmentFormValues } from "@/features/commitments/components/CommitmentForm";

export default function CommitmentsPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const commitments = useAppSelector(commitmentSelectors.selectAll);
  const [status, setStatus] = useState("");
  const [frequency, setFrequency] = useState("");

  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);

  const filteredCommitments = useMemo(
    () =>
      commitments.filter(
        (commitment) =>
          (!status || commitment.status === status) &&
          (!frequency || commitment.paymentFrequency === frequency),
      ),
    [commitments, frequency, status],
  );

  const handleCreate = (values: CommitmentFormValues) => {
    void dispatch(commitmentFeature.createOne(values as Omit<Commitment, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Record created", description: `${values.category} commitment was added to the register.` });
    setIsCreating(false);
  };

  const handleEdit = (values: CommitmentFormValues) => {
    if (!editingCommitment) return;
    void dispatch(commitmentFeature.updateOne({ id: editingCommitment.id, patch: values as Partial<Commitment> }) as never);
    notify({ tone: "success", title: "Record updated", description: `${values.category} commitment changes were saved.` });
    setEditingCommitment(null);
  };

  const handleDelete = () => {
    if (!deletingCommitment) return;
    void dispatch(commitmentFeature.deleteOne({ id: deletingCommitment.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Record deleted", description: `${deletingCommitment.category} commitment was soft-deleted.` });
    setDeletingCommitment(null);
  };

  const columns: ColumnDef<Commitment>[] = [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "approvalDate", header: "Approval", cell: ({ row }) => new Date(row.original.approvalDate).toLocaleDateString() },
    { accessorKey: "totalApproved.convertedAmount", header: "Approved", cell: ({ row }) => formatCurrency(row.original.totalApproved.convertedAmount, "INR") },
    { accessorKey: "amountPaid", header: "Paid", cell: ({ row }) => formatCurrency(row.original.amountPaid, "INR") },
    { accessorKey: "remainingBalance", header: "Remaining", cell: ({ row }) => formatCurrency(row.original.remainingBalance, "INR") },
    { accessorKey: "paymentFrequency", header: "Frequency" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="payments:approve">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingCommitment(row.original)}
              aria-label={`Edit ${row.original.category}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingCommitment(row.original)}
              aria-label={`Delete ${row.original.category}`}
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
      title="Long-Term Commitments"
      description="Installment tracking, future liabilities, and outstanding commitment reports."
      data={filteredCommitments}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Active", "Closed"]} />
          <SelectFilter label="Frequency" value={frequency} onChange={setFrequency} options={["Monthly", "Quarterly", "One-time"]} />
        </>
      }
    >
      <div className="flex justify-end">
        <PermissionGuard permission="payments:approve">
          <Button onClick={() => setIsCreating(true)} type="button">
            <CopyPlus className="h-4 w-4" />
            Create commitment
          </Button>
        </PermissionGuard>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal title="Create commitment" onClose={() => setIsCreating(false)}>
          <CommitmentForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} submitLabel="Create" />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingCommitment && (
        <Modal title={`Edit ${editingCommitment.category}`} onClose={() => setEditingCommitment(null)}>
          <CommitmentForm
            defaultValues={{
              beneficiaryId: editingCommitment.beneficiaryId,
              category: editingCommitment.category,
              approvalDate: editingCommitment.approvalDate,
              approvedBy: editingCommitment.approvedBy,
              totalApproved: editingCommitment.totalApproved,
              amountPaid: editingCommitment.amountPaid,
              remainingBalance: editingCommitment.remainingBalance,
              futureLiability: editingCommitment.futureLiability,
              paymentFrequency: editingCommitment.paymentFrequency,
              paymentPeriod: editingCommitment.paymentPeriod,
              status: editingCommitment.status,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingCommitment(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingCommitment && (
        <ConfirmationDialog
          title={`Delete ${deletingCommitment.category}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingCommitment(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
