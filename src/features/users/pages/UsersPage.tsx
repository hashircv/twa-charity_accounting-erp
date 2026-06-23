import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { PermissionGuard } from "@/app/guards/PermissionGuard";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { SelectControl } from "@/components/forms/FormField";
import { Modal } from "@/components/modals/Modal";
import { ModulePage } from "@/components/shared/ModulePage";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toaster";
import { AddUserForm, type AddUserFormValues } from "@/features/users/components/AddUserForm";
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

interface UserAccount {
  id: string;
  memberId: string;
  username: string;
  password: string;
  role: UserRole;
}

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
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

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

  const assignRole = (user: UserAccountRow) => {
    const nextRole = draftRoles[user.id] ?? user.role;

    if (nextRole === user.role) {
      notify({ tone: "info", title: "No role change", description: `${user.name} is already assigned as ${user.role}.` });
      return;
    }

    if (user.member) {
      void dispatch(memberFeature.updateOne({ id: user.member.id, patch: { role: nextRole } }) as never);
    }

    setUserAccounts((current) => current.map((account) => (account.id === user.id ? { ...account, role: nextRole } : account)));
    notify({ tone: "success", title: "Role assigned", description: `${user.name} is now assigned as ${nextRole}.` });
    setDraftRoles((current) => {
      const next = { ...current };
      delete next[user.id];
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

    setUserAccounts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        memberId: member.id,
        username: values.username,
        password: values.password,
        role: values.role,
      },
    ]);
    void dispatch(memberFeature.updateOne({ id: member.id, patch: { role: values.role, status: "Active" } }) as never);
    notify({ tone: "success", title: "User added", description: `${member.name} can now sign in as ${values.username}.` });
    setIsAddingUser(false);
  };

  const columns: ColumnDef<UserAccountRow>[] = [
    { accessorKey: "username", header: "Username" },
    { accessorKey: "password", header: "Password", cell: () => "••••••••" },
    { accessorKey: "memberCode", header: "Member ID" },
    { accessorKey: "name", header: "User Name" },
    { accessorKey: "contactNumber", header: "Phone Number" },
    { accessorKey: "role", header: "Current Role", cell: ({ row }) => <RoleBadge role={row.original.role} /> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "assignRole",
      header: "Assign Role",
      cell: ({ row }) => (
        <PermissionGuard permission="settings:manage">
          <div className="flex min-w-56 items-center gap-2 sm:min-w-72">
            <SelectControl
              className="sm:h-8 sm:px-2"
              options={USER_ROLES.map((item) => ({ value: item, label: item }))}
              value={draftRoles[row.original.id] ?? row.original.role}
              onChange={(event) =>
                setDraftRoles((current) => ({
                  ...current,
                  [row.original.id]: event.target.value as UserRole,
                }))
              }
            />
            <button
              className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-emerald-700 disabled:opacity-40 dark:border-slate-800"
              onClick={() => assignRole(row.original)}
              disabled={(draftRoles[row.original.id] ?? row.original.role) === row.original.role}
              aria-label={`Assign role to ${row.original.name}`}
              type="button"
            >
              <Save className="h-4 w-4" />
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
    </ModulePage>
  );
}
