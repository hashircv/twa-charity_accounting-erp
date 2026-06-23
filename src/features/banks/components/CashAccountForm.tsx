import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const cashAccountSchema = z.object({
  userName: z.string().min(2, "User name must be at least 2 characters"),
  phoneNumber: z.string().min(6, "Phone number must be at least 6 characters"),
});

export type CashAccountFormValues = z.infer<typeof cashAccountSchema>;

interface CashAccountFormProps {
  onSubmit: (values: CashAccountFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function CashAccountForm({ onSubmit, onCancel, submitLabel = "Save" }: CashAccountFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CashAccountFormValues>({
    resolver: zodResolver(cashAccountSchema),
    defaultValues: {
      userName: "",
      phoneNumber: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="userName"
          label="User Name"
          placeholder="e.g. Treasurer"
          error={errors.userName?.message}
          {...register("userName")}
        />
        <TextField
          id="phoneNumber"
          label="Phone Number"
          placeholder="e.g. +965 5555 5555"
          error={errors.phoneNumber?.message}
          {...register("phoneNumber")}
        />
      </div>

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
