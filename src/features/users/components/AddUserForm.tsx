import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import type { Member, UserRole } from "@/types/domain";

const userRoles: UserRole[] = [
  "Administrator",
  "President",
  "Secretary",
  "Treasurer",
  "Executive Member",
  "General Member",
];

const addUserSchema = z
  .object({
    memberId: z.string().min(1, "Select a member"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    role: z.enum(userRoles as [UserRole, ...UserRole[]], { required_error: "Select a role" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AddUserFormValues = z.infer<typeof addUserSchema>;

interface AddUserFormProps {
  members: Member[];
  onSubmit: (values: AddUserFormValues) => void;
  onCancel: () => void;
}

export function AddUserForm({ members, onSubmit, onCancel }: AddUserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      memberId: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <SelectField
        id="memberId"
        label="Member"
        placeholder="Select member"
        error={errors.memberId?.message}
        options={members.map((member) => ({
          value: member.id,
          label: `${member.name} - ${member.memberId}`,
        }))}
        {...register("memberId")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="username"
          label="Username"
          placeholder="e.g. treasurer01"
          error={errors.username?.message}
          {...register("username")}
        />
        <TextField
          id="password"
          label="Password"
          placeholder="Minimum 6 characters"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter password"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      <SelectField
        id="role"
        label="Role"
        placeholder="Select role"
        error={errors.role?.message}
        options={userRoles.map((role) => ({ value: role, label: role }))}
        {...register("role")}
      />

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button className="bg-slate-600 hover:bg-slate-700" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Add user
        </Button>
      </div>
    </form>
  );
}
