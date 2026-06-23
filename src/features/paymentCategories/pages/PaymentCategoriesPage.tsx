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
import {
  PaymentCategoryForm,
  type PaymentCategoryFormValues,
} from "@/features/paymentCategories/components/PaymentCategoryForm";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { paymentCategoryFeature } from "@/store/features";
import { paymentCategorySelectors } from "@/store/selectors";
import type { BaseEntity, PaymentCategory } from "@/types/domain";

export default function PaymentCategoriesPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const categories = useAppSelector(paymentCategorySelectors.selectAll);
  const [status, setStatus] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PaymentCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<PaymentCategory | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((category) => !status || category.status === status),
    [categories, status],
  );

  const handleCreate = (values: PaymentCategoryFormValues) => {
    void dispatch(paymentCategoryFeature.createOne(values as Omit<PaymentCategory, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Category created", description: `${values.name} is now available in beneficiary and payment forms.` });
    setIsCreating(false);
  };

  const handleEdit = (values: PaymentCategoryFormValues) => {
    if (!editingCategory) return;
    void dispatch(paymentCategoryFeature.updateOne({ id: editingCategory.id, patch: values as Partial<PaymentCategory> }) as never);
    notify({ tone: "success", title: "Category updated", description: `${values.name} changes were saved.` });
    setEditingCategory(null);
  };

  const handleDelete = () => {
    if (!deletingCategory) return;
    void dispatch(paymentCategoryFeature.deleteOne({ id: deletingCategory.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Category removed", description: `${deletingCategory.name} was removed from active masters.` });
    setDeletingCategory(null);
  };

  const columns: ColumnDef<PaymentCategory>[] = [
    { accessorKey: "name", header: "Category" },
    { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "-" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="settings:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingCategory(row.original)}
              aria-label={`Edit ${row.original.name}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingCategory(row.original)}
              aria-label={`Delete ${row.original.name}`}
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
      title="Payment Categories"
      description="Maintain extendable assistance and payment category masters."
      data={filteredCategories}
      columns={columns}
      filterSlot={<SelectFilter label="Status" value={status} onChange={setStatus} options={["Active", "Inactive"]} />}
    >
      <div className="flex justify-end">
        <PermissionGuard permission="settings:manage">
          <Button type="button" onClick={() => setIsCreating(true)}>
            <CopyPlus className="h-4 w-4" />
            Create category
          </Button>
        </PermissionGuard>
      </div>

      {isCreating && (
        <Modal title="Create payment category" onClose={() => setIsCreating(false)}>
          <PaymentCategoryForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} submitLabel="Create" />
        </Modal>
      )}

      {editingCategory && (
        <Modal title={`Edit ${editingCategory.name}`} onClose={() => setEditingCategory(null)}>
          <PaymentCategoryForm
            defaultValues={{
              name: editingCategory.name,
              description: editingCategory.description,
              status: editingCategory.status,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingCategory(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {deletingCategory && (
        <ConfirmationDialog
          title={`Delete ${deletingCategory.name}?`}
          description="This removes the category from active masters. Existing records will still keep their category text."
          confirmLabel="Delete"
          onCancel={() => setDeletingCategory(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
