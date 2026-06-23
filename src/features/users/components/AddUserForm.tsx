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
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    role: z.enum(userRoles as [UserRole, ...UserRole[]], { required_error: "Select a role" }),
  })
  .superRefine((values, ctx) => {
    if (!values.password && !values.confirmPassword) return;
    if (!values.password || values.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 6 characters",
        path: ["password"],
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type AddUserFormValues = z.infer<typeof addUserSchema>;

interface AddUserFormProps {
  members: Member[];
  defaultValues?: Partial<AddUserFormValues>;
  passwordRequired?: boolean;
  onSubmit: (values: AddUserFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function AddUserForm({
  members,
  defaultValues,
  passwordRequired = true,
  onSubmit,
  onCancel,
  submitLabel = "Add user",
}: AddUserFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      memberId: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      ...defaultValues,
    },
  });

  const submitForm = (values: AddUserFormValues) => {
    if (passwordRequired && !values.password) {
      setError("password", { message: "Password is required" });
      return;
    }
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-4">
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
          placeholder={passwordRequired ? "Minimum 6 characters" : "Leave blank to keep current"}
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
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
