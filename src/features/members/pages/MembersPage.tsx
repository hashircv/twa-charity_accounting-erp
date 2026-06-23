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
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { memberFeature } from "@/store/features";
import { memberSelectors } from "@/store/selectors";
import type { BaseEntity, Member } from "@/types/domain";
import { MemberForm, type MemberFormValues } from "@/features/members/components/MemberForm";

function getNextMemberId(members: Member[]) {
  const nextNumber =
    members.reduce((largest, member) => {
      const match = member.memberId.match(/^MEM-(\d+)$/i);
      return match ? Math.max(largest, Number(match[1])) : largest;
    }, 0) + 1;

  return `MEM-${String(nextNumber).padStart(6, "0")}`;
}

export default function MembersPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notify } = useToast();
  const members = useAppSelector(memberSelectors.selectAll);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  const filteredMembers = useMemo(
    () => members.filter((member) => (!role || member.role === role) && (!status || member.status === status)),
    [members, role, status],
  );
  const nextMemberId = useMemo(() => getNextMemberId(members), [members]);

  const handleCreate = (values: MemberFormValues) => {
    const memberId = getNextMemberId(members);
    void dispatch(memberFeature.createOne({ ...values, memberId } as Omit<Member, keyof BaseEntity>) as never);
    notify({ tone: "success", title: "Record created", description: `${memberId} was added to the register.` });
    setIsCreating(false);
  };

  const handleEdit = (values: MemberFormValues) => {
    if (!editingMember) return;
    void dispatch(memberFeature.updateOne({ id: editingMember.id, patch: { ...values, memberId: editingMember.memberId } as Partial<Member> }) as never);
    notify({ tone: "success", title: "Record updated", description: `${editingMember.memberId} changes were saved.` });
    setEditingMember(null);
  };

  const handleDelete = () => {
    if (!deletingMember) return;
    void dispatch(memberFeature.deleteOne({ id: deletingMember.id, deletedBy: "TWA Administrator" }) as never);
    notify({ tone: "success", title: "Record deleted", description: `${deletingMember.memberId} was soft-deleted.` });
    setDeletingMember(null);
  };

  const columns: ColumnDef<Member>[] = [
    { accessorKey: "memberId", header: "Member ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "age", header: "Age" },
    { accessorKey: "contactNumber", header: "Contact" },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <RoleBadge role={row.original.role} /> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="members:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => navigate(`/members/${row.original.id}`)}
              aria-label={`View ${row.original.memberId}`}
              type="button"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingMember(row.original)}
              aria-label={`Edit ${row.original.memberId}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingMember(row.original)}
              aria-label={`Delete ${row.original.memberId}`}
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
      title="Member Management"
      description="Membership, role assignment, subscriptions, and activity history."
      data={filteredMembers}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Role" value={role} onChange={setRole} options={[...new Set(members.map((item) => item.role))]} />
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Active", "Inactive"]} />
        </>
      }
    >
      <div className="flex justify-end">
        <PermissionGuard permission="members:manage">
          <Button onClick={() => setIsCreating(true)} type="button">
            <CopyPlus className="h-4 w-4" />
            Create member
          </Button>
        </PermissionGuard>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <Modal title="Create member" onClose={() => setIsCreating(false)}>
          <MemberForm
            defaultValues={{ memberId: nextMemberId }}
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
            submitLabel="Create"
            memberIdLocked
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <Modal title={`Edit ${editingMember.memberId}`} onClose={() => setEditingMember(null)}>
          <MemberForm
            defaultValues={{
              memberId: editingMember.memberId,
              name: editingMember.name,
              profilePhoto: editingMember.profilePhoto ?? "",
              age: editingMember.age,
              contactNumber: editingMember.contactNumber,
              whatsappNumber: editingMember.whatsappNumber,
              kuwaitAddress: editingMember.kuwaitAddress,
              civilId: editingMember.civilId ?? "",
              joiningDate: editingMember.joiningDate,
              role: editingMember.role,
              status: editingMember.status,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingMember(null)}
            submitLabel="Save changes"
            memberIdLocked
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingMember && (
        <ConfirmationDialog
          title={`Delete ${deletingMember.memberId}?`}
          description="This will soft-delete the record from active registers while preserving the audit-ready entity lifecycle."
          confirmLabel="Delete"
          onCancel={() => setDeletingMember(null)}
          onConfirm={handleDelete}
        />
      )}
    </ModulePage>
  );
}
