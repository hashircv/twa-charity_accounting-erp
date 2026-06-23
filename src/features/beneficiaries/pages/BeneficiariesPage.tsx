import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Eye, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { beneficiaryFeature } from "@/store/features";
import { beneficiarySelectors, paymentCategorySelectors } from "@/store/selectors";
import type { BaseEntity, Beneficiary } from "@/types/domain";
import { defaultPaymentCategoryNames } from "@/features/paymentCategories/paymentCategoryDefaults";
import {
  BeneficiaryForm,
  type BeneficiaryFormValues,
  fromBeneficiaryEntity,
  toBeneficiaryPayload,
} from "@/features/beneficiaries/components/BeneficiaryForm";

function getNextBeneficiaryId(beneficiaries: Beneficiary[]) {
  const nextNumber =
    beneficiaries.reduce((largest, beneficiary) => {
      const match = beneficiary.beneficiaryId.match(/^BEN-(\d+)$/i);
      return match ? Math.max(largest, Number(match[1])) : largest;
    }, 0) + 1;

  return `BEN-${String(nextNumber).padStart(6, "0")}`;
}

export default function BeneficiariesPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notify } = useToast();
  const beneficiaries = useAppSelector(beneficiarySelectors.selectAll);
  const paymentCategories = useAppSelector(paymentCategorySelectors.selectAll);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [income, setIncome] = useState("");

  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [deletingBeneficiary, setDeletingBeneficiary] = useState<Beneficiary | null>(null);

  const filteredBeneficiaries = useMemo(
    () =>
      beneficiaries.filter(
        (beneficiary) =>
          (!status || beneficiary.status === status) &&
          (!category || beneficiary.category === category) &&
          (!income || beneficiary.incomeStatus === income),
      ),
    [beneficiaries, category, income, status],
  );
  const nextBeneficiaryId = useMemo(() => getNextBeneficiaryId(beneficiaries), [beneficiaries]);
  const activeCategoryOptions = useMemo(
    () => paymentCategories.filter((item) => item.status === "Active").map((item) => item.name),
    [paymentCategories],
  );
  const categoryOptions = activeCategoryOptions.length ? activeCategoryOptions : defaultPaymentCategoryNames;

  const handleCreate = (values: BeneficiaryFormValues) => {
    const beneficiaryId = getNextBeneficiaryId(beneficiaries);
    const payload = { ...toBeneficiaryPayload(values), beneficiaryId, status: "Pending" as const };
    void dispatch(beneficiaryFeature.createOne(payload as Omit<Beneficiary, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Record created", description: `${beneficiaryId} was added to the register.` });
    setIsCreating(false);
  };

  const handleEdit = (values: BeneficiaryFormValues) => {
    if (!editingBeneficiary) return;
    const payload = { ...toBeneficiaryPayload(values), beneficiaryId: editingBeneficiary.beneficiaryId };
    if (payload.caseDocuments.length === 0) {
      payload.caseDocuments = editingBeneficiary.caseDocuments;
    }
    void dispatch(beneficiaryFeature.updateOne({ id: editingBeneficiary.id, patch: payload as Partial<Beneficiary> }) as never);
    notify({ tone: "success", title: "Record updated", description: `${editingBeneficiary.beneficiaryId} changes were saved.` });
    setEditingBeneficiary(null);
  };

  const handleDelete = () => {
    if (!deletingBeneficiary) return;
    void dispatch(beneficiaryFeature.deleteOne({ id: deletingBeneficiary.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Record deleted", description: `${deletingBeneficiary.beneficiaryId} was soft-deleted.` });
    setDeletingBeneficiary(null);
  };

  const columns: ColumnDef<Beneficiary>[] = [
    { accessorKey: "beneficiaryId", header: "Beneficiary ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "mobileNumber", header: "Mobile" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="beneficiaries:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => navigate(`/beneficiaries/${row.original.id}`)}
              aria-label={`View ${row.original.beneficiaryId}`}
              type="button"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingBeneficiary(row.original)}
              aria-label={`Edit ${row.original.beneficiaryId}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingBeneficiary(row.original)}
              aria-label={`Delete ${row.original.beneficiaryId}`}
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
      title="Beneficiary Management"
      description="Case intake, family details, document tracking, and assistance history."
      data={filteredBeneficiaries}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Pending", "Approved", "Active", "Closed"]} />
          <SelectFilter label="Category" value={category} onChange={setCategory} options={[...new Set(beneficiaries.map((item) => item.category))]} />
          <SelectFilter label="Income" value={income} onChange={setIncome} options={["No Income", "Low Income", "Irregular Income"]} />
        </>
      }
    >
      <div className="flex justify-end">
        <PermissionGuard permission="beneficiaries:manage">
          <Button onClick={() => setIsCreating(true)} type="button">
            <CopyPlus className="h-4 w-4" />
            Create Beneficiary
          </Button>
        </PermissionGuard>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal title="Create case" onClose={() => setIsCreating(false)}>
          <BeneficiaryForm
            defaultValues={{ beneficiaryId: nextBeneficiaryId }}
            categoryOptions={categoryOptions}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
            submitLabel="Create"
            beneficiaryIdLocked
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingBeneficiary && (
        <Modal title={`Edit ${editingBeneficiary.beneficiaryId}`} onClose={() => setEditingBeneficiary(null)}>
          <BeneficiaryForm
            defaultValues={fromBeneficiaryEntity(editingBeneficiary)}
            categoryOptions={categoryOptions}
            onSubmit={handleEdit}
            onCancel={() => setEditingBeneficiary(null)}
            submitLabel="Save changes"
            beneficiaryIdLocked
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingBeneficiary && (
        <ConfirmationDialog
          title={`Delete ${deletingBeneficiary.beneficiaryId}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingBeneficiary(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
