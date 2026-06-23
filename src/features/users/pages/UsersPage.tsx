import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Eye, Pencil, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { ConfirmationDialog } from "@/components/modals/ConfirmationDialog";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { AddUserForm, type AddUserFormValues } from "@/features/users/components/AddUserForm";
import { readUserAccounts, type UserAccount, writeUserAccounts } from "@/features/users/userAccountsStore";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { memberFeature } from "@/store/features";
import { memberSelectors } from "@/store/selectors";
import type { Member, UserRole } from "@/types/domain";

const USER_ROLES: UserRole[] = [
  "Administrator",
  "President",
  "Secretary",
  "Treasurer",
  "Executive Member",
  "General Member",
];

interface UserAccountRow extends UserAccount {
  member?: Member;
  memberCode: string;
  name: string;
  contactNumber: string;
  status: Member["status"] | "Missing";
}

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const members = useAppSelector(memberSelectors.selectAll);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => readUserAccounts());
  const [viewingUser, setViewingUser] = useState<UserAccountRow | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccountRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccountRow | null>(null);

  const userRows = useMemo<UserAccountRow[]>(
    () =>
      userAccounts.map((account) => {
        const member = members.find((item) => item.id === account.memberId);

        return {
          ...account,
          member,
          memberCode: member?.memberId ?? "-",
          name: member?.name ?? "Member not found",
          contactNumber: member?.contactNumber ?? "-",
          status: member?.status ?? "Missing",
        };
      }),
    [members, userAccounts],
  );

  const filteredUsers = useMemo(
    () => userRows.filter((user) => (!role || user.role === role) && (!status || user.status === status)),
    [role, status, userRows],
  );

  const persistUserAccounts = (updater: (current: UserAccount[]) => UserAccount[]) => {
    setUserAccounts((current) => {
      const next = updater(current);
      writeUserAccounts(next);
      return next;
    });
  };

  const handleAddUser = (values: AddUserFormValues) => {
    const member = members.find((item) => item.id === values.memberId);

    if (!member) {
      notify({ tone: "error", title: "User not added", description: "Selected member could not be found." });
      return;
    }

    if (userAccounts.some((account) => account.username.toLowerCase() === values.username.toLowerCase())) {
      notify({ tone: "error", title: "Username exists", description: "Choose a different username for this user." });
      return;
    }

    if (userAccounts.some((account) => account.memberId === member.id)) {
      notify({ tone: "error", title: "User already exists", description: `${member.name} already has a user account.` });
      return;
    }

    persistUserAccounts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        memberId: member.id,
        username: values.username,
        password: values.password ?? "",
        role: values.role,
      },
    ]);
    void dispatch(memberFeature.updateOne({ id: member.id, patch: { role: values.role, status: "Active" } }) as never);
    notify({ tone: "success", title: "User added", description: `${member.name} can now sign in as ${values.username}.` });
    setIsAddingUser(false);
  };

  const handleEditUser = (values: AddUserFormValues) => {
    if (!editingUser) return;
    const member = members.find((item) => item.id === values.memberId);

    if (!member) {
      notify({ tone: "error", title: "User not updated", description: "Selected member could not be found." });
      return;
    }

    if (userAccounts.some((account) => account.id !== editingUser.id && account.username.toLowerCase() === values.username.toLowerCase())) {
      notify({ tone: "error", title: "Username exists", description: "Choose a different username for this user." });
      return;
    }

    if (userAccounts.some((account) => account.id !== editingUser.id && account.memberId === values.memberId)) {
      notify({ tone: "error", title: "User already exists", description: `${member.name} already has a user account.` });
      return;
    }

    persistUserAccounts((current) =>
      current.map((account) =>
        account.id === editingUser.id
          ? {
              ...account,
              memberId: values.memberId,
              username: values.username,
              password: values.password ? values.password : account.password,
              role: values.role,
            }
          : account,
      ),
    );
    void dispatch(memberFeature.updateOne({ id: member.id, patch: { role: values.role, status: "Active" } }) as never);
    notify({ tone: "success", title: "User updated", description: `${member.name} changes were saved.` });
    setEditingUser(null);
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    persistUserAccounts((current) => current.filter((account) => account.id !== deletingUser.id));
    notify({ tone: "success", title: "User deleted", description: `${deletingUser.name} login account was removed.` });
    setDeletingUser(null);
  };

  const getUserDetailFields = (user: UserAccountRow): Array<[string, string]> => {
    const member = user.member;
    return [
      ["Username", user.username],
      ["Member ID", user.memberCode],
      ["Name", user.name],
      ["Role", user.role],
      ["Status", user.status],
      ["Contact Number", user.contactNumber],
      ["WhatsApp Number", member?.whatsappNumber ?? "-"],
      ["Age", member ? String(member.age) : "-"],
      ["Joining Date", member?.joiningDate ? new Date(member.joiningDate).toLocaleDateString() : "-"],
      ["Kuwait Address", member?.kuwaitAddress ?? "-"],
      ["Civil ID", member?.civilId ?? "-"],
    ];
  };

  const columns: ColumnDef<UserAccountRow>[] = [
    {
      id: "profile",
      header: "Photo",
      cell: ({ row }) => (
        <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
          {row.original.member?.profilePhoto ? (
            <img src={row.original.member.profilePhoto} alt={`${row.original.name} profile`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <UserRound className="h-5 w-5" />
            </div>
          )}
        </div>
      ),
    },
    { accessorKey: "username", header: "Username" },
    { accessorKey: "password", header: "Password", cell: () => "********" },
    { accessorKey: "memberCode", header: "Member ID" },
    { accessorKey: "name", header: "User Name" },
    { accessorKey: "contactNumber", header: "Phone Number" },
    { accessorKey: "role", header: "Current Role", cell: ({ row }) => <RoleBadge role={row.original.role} /> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <PermissionGuard permission="settings:manage">
          <div className="flex gap-2">
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setViewingUser(row.original)}
              aria-label={`View ${row.original.name}`}
              type="button"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 dark:border-slate-800"
              onClick={() => setEditingUser(row.original)}
              aria-label={`Edit ${row.original.name}`}
              type="button"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded border border-red-200 text-red-700"
              onClick={() => setDeletingUser(row.original)}
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
      title="Users"
      description="Create user login accounts and assign members into application roles."
      data={filteredUsers}
      columns={columns}
      filterSlot={
        <>
          <SelectFilter label="Role" value={role} onChange={setRole} options={USER_ROLES} />
          <SelectFilter label="Status" value={status} onChange={setStatus} options={["Active", "Inactive"]} />
        </>
      }
    >
      <div className="flex justify-end">
        <PermissionGuard permission="settings:manage">
          <Button type="button" onClick={() => setIsAddingUser(true)}>
            <CopyPlus className="h-4 w-4" />
            Add user
          </Button>
        </PermissionGuard>
      </div>

      {isAddingUser && (
        <Modal title="Add user" onClose={() => setIsAddingUser(false)}>
          <AddUserForm
            members={members.filter((member) => !userAccounts.some((account) => account.memberId === member.id))}
            onSubmit={handleAddUser}
            onCancel={() => setIsAddingUser(false)}
          />
        </Modal>
      )}

      {viewingUser && (
        <Modal title={`User details - ${viewingUser.name}`} onClose={() => setViewingUser(null)}>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-24 w-24 overflow-hidden rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                {viewingUser.member?.profilePhoto ? (
                  <img src={viewingUser.member.profilePhoto} alt={`${viewingUser.name} profile`} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <UserRound className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{viewingUser.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{viewingUser.username} / {viewingUser.memberCode}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RoleBadge role={viewingUser.role} />
                  <StatusBadge status={viewingUser.status} />
                </div>
              </div>
            </div>

            <Card>
              <CardHeader title="Member Profile" />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {getUserDetailFields(viewingUser).map(([label, value]) => (
                  <div className="rounded border border-slate-100 p-3 dark:border-slate-800" key={label}>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Modal>
      )}

      {editingUser && (
        <Modal title={`Edit user - ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <AddUserForm
            members={[editingUser.member, ...members.filter((member) => !userAccounts.some((account) => account.memberId === member.id))]
              .filter((member): member is Member => Boolean(member))}
            defaultValues={{
              memberId: editingUser.memberId,
              username: editingUser.username,
              password: "",
              confirmPassword: "",
              role: editingUser.role,
            }}
            passwordRequired={false}
            onSubmit={handleEditUser}
            onCancel={() => setEditingUser(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {deletingUser && (
        <ConfirmationDialog
          title={`Delete ${deletingUser.name}?`}
          description="This will remove the user's login account. The linked member profile will remain available."
          confirmLabel="Delete"
          onCancel={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </ModulePage>
  );
}
