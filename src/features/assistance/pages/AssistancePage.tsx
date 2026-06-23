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
import { assistanceFeature } from "@/store/features";
import { assistanceSelectors } from "@/store/selectors";
import type { Assistance, BaseEntity } from "@/types/domain";
import { formatCurrency } from "@/utils/currency";
import { AssistanceForm, type AssistanceFormValues } from "@/features/assistance/components/AssistanceForm";

export default function AssistancePage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const records = useAppSelector(assistanceSelectors.selectAll);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");

  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Assistance | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<Assistance | null>(null);

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (!status || record.status === status) &&
          (!category || record.category === category) &&
          (!method || record.deliveryMethod === method),
      ),
    [records, status, category, method],
  );

  const handleCreate = (values: AssistanceFormValues) => {
    void dispatch(assistanceFeature.createOne(values as Omit<Assistance, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Record created", description: `${values.assistanceId} assistance was added to the register.` });
    setIsCreating(false);
  };

  const handleEdit = (values: AssistanceFormValues) => {
    if (!editingRecord) return;
    void dispatch(assistanceFeature.updateOne({ id: editingRecord.id, patch: values as Partial<Assistance> }) as never);
    notify({ tone: "success", title: "Record updated", description: `${values.assistanceId} assistance changes were saved.` });
    setEditingRecord(null);
  };

  const handleDelete = () => {
    if (!deletingRecord) return;
    void dispatch(assistanceFeature.deleteOne({ id: deletingRecord.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Record deleted", description: `${deletingRecord.assistanceId} was soft-deleted.` });
    setDeletingRecord(null);
  };

  const columns: ColumnDef<Assistance>[] = [
    { accessorKey: "assistanceId", header: "Aid ID" },
    { accessorKey: "beneficiaryName", header: "Beneficiary" },
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "amount.originalAmount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount.originalAmount, row.original.amount.currency),
    },
    {
      accessorKey: "deliveryDate",
      header: "Delivery",
      cell: ({ row }) => new Date(row.original.deliveryDate).toLocaleDateString(),
    },
    { accessorKey: "deliveryMethod", header: "Method" },
    { accessorKey: "approvedBy", header: "Approved By" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="beneficiaries:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingRecord(row.original)}
              aria-label={`Edit ${row.original.assistanceId}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingRecord(row.original)}
              aria-label={`Delete ${row.original.assistanceId}`}
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
      title="Assistance Management"
      description="Aid delivery tracking, category-wise distribution, approvals, and beneficiary assistance history."
      data={filteredRecords}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Pending", "Approved", "Delivered", "Cancelled"]} />
          <SelectFilter label="Category" value={category} onChange={setCategory} options={[...new Set(records.map((r) => r.category))]} />
          <SelectFilter label="Method" value={method} onChange={setMethod} options={["Cash", "Bank Transfer", "In-Kind"]} />
        </>
      }
    >
      <div className="flex justify-end">
        <PermissionGuard permission="beneficiaries:manage">
          <Button onClick={() => setIsCreating(true)} type="button">
            <CopyPlus className="h-4 w-4" />
            Create assistance
          </Button>
        </PermissionGuard>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal title="Create assistance record" onClose={() => setIsCreating(false)}>
          <AssistanceForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} submitLabel="Create" />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <Modal title={`Edit ${editingRecord.assistanceId}`} onClose={() => setEditingRecord(null)}>
          <AssistanceForm
            defaultValues={{
              assistanceId: editingRecord.assistanceId,
              beneficiaryId: editingRecord.beneficiaryId,
              beneficiaryName: editingRecord.beneficiaryName,
              category: editingRecord.category,
              amount: editingRecord.amount,
              deliveryDate: editingRecord.deliveryDate,
              deliveryMethod: editingRecord.deliveryMethod,
              approvedBy: editingRecord.approvedBy,
              handledBy: editingRecord.handledBy,
              narration: editingRecord.narration,
              status: editingRecord.status,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingRecord(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingRecord && (
        <ConfirmationDialog
          title={`Delete ${deletingRecord.assistanceId}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingRecord(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
