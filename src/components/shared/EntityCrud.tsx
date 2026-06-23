import { CopyPlus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch } from "@/hooks/redux";
import type { BaseEntity, Permission } from "@/types/domain";

type CrudFeature<T extends BaseEntity> = {
  createOne: (entity: Omit<T, keyof BaseEntity>) => unknown;
  updateOne: (payload: { id: string; patch: Partial<T> }) => unknown;
  deleteOne: (payload: { id: string; deletedBy: string }) => unknown;
};

const stripBaseEntity = <T extends BaseEntity>(entity: T): Omit<T, keyof BaseEntity> => {
  const { id, createdAt, updatedAt, createdBy, updatedBy, deletedAt, deletedBy, ...rest } = entity;
  void id;
  void createdAt;
  void updatedAt;
  void createdBy;
  void updatedBy;
  void deletedAt;
  void deletedBy;
  return rest as Omit<T, keyof BaseEntity>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeEditedValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeEditedValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !["id", "createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "deletedBy"].includes(key)),
  );
};

export function CreateEntityButton<T extends BaseEntity>({
  label,
  feature,
  source,
  permission,
}: {
  label: string;
  feature: CrudFeature<T>;
  source?: T;
  permission: Permission;
}) {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const initialDraft = useMemo(() => (source ? JSON.stringify(stripBaseEntity(source), null, 2) : ""), [source]);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");

  if (!source) return null;

  return (
    <PermissionGuard permission={permission}>
      <Button
        onClick={() => {
          setDraft(initialDraft);
          setError("");
          setIsCreating(true);
        }}
        type="button"
      >
        <CopyPlus className="h-4 w-4" />
        {label}
      </Button>
      {isCreating && (
        <Modal title={label} onClose={() => setIsCreating(false)}>
          <textarea
            className="min-h-80 w-full rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="bg-slate-600 hover:bg-slate-700" onClick={() => setIsCreating(false)} type="button">
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  void dispatch(feature.createOne(JSON.parse(draft) as Omit<T, keyof BaseEntity>) as never);
                  notify({ tone: "success", title: "Record created", description: `${label} was added to the register.` });
                  setIsCreating(false);
                } catch {
                  setError("Enter valid JSON before creating.");
                  notify({ tone: "error", title: "Create failed", description: "The JSON payload is not valid." });
                }
              }}
              type="button"
            >
              Create
            </Button>
          </div>
        </Modal>
      )}
    </PermissionGuard>
  );
}

export function EntityCrudActions<T extends BaseEntity>({
  entity,
  feature,
  label,
  permission,
}: {
  entity: T;
  feature: CrudFeature<T>;
  label: string;
  permission: Permission;
}) {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const editableJson = useMemo(() => JSON.stringify(normalizeEditedValue(entity), null, 2), [entity]);
  const [draft, setDraft] = useState(editableJson);
  const [error, setError] = useState("");

  return (
    <PermissionGuard permission={permission}>
      <div className="flex gap-2">
        <button
          className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
          onClick={() => {
            setDraft(editableJson);
            setError("");
            setIsEditing(true);
          }}
          aria-label={`Edit ${label}`}
          type="button"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
          onClick={() => setPendingDelete(true)}
          aria-label={`Delete ${label}`}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {isEditing && (
        <Modal title={`Edit ${label}`} onClose={() => setIsEditing(false)}>
          <textarea
            className="min-h-80 w-full rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="bg-slate-600 hover:bg-slate-700" onClick={() => setIsEditing(false)} type="button">
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  const parsed = JSON.parse(draft) as Partial<T>;
                  void dispatch(feature.updateOne({ id: entity.id, patch: parsed }) as never);
                  notify({ tone: "success", title: "Record updated", description: `${label} changes were saved.` });
                  setIsEditing(false);
                } catch {
                  setError("Enter valid JSON before saving.");
                  notify({ tone: "error", title: "Update failed", description: "The JSON payload is not valid." });
                }
              }}
              type="button"
            >
              Save changes
            </Button>
          </div>
        </Modal>
      )}
      {pendingDelete && (
        <ConfirmationDialog
          title={`Delete ${label}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => {
            void dispatch(feature.deleteOne({ id: entity.id, deletedBy: "TWA Administrator" }) as never);
            notify({ tone: "success", title: "Record deleted", description: `${label} was soft-deleted.` });
            setPendingDelete(false);
          }}
        />
      )}
    </PermissionGuard>
  );
}
