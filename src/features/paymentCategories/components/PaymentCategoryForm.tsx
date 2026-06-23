import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const paymentCategorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  description: z.string().optional(),
  status: z.enum(["Active", "Inactive"], { required_error: "Select status" }),
});

export type PaymentCategoryFormValues = z.infer<typeof paymentCategorySchema>;

export function PaymentCategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  defaultValues?: Partial<PaymentCategoryFormValues>;
  onSubmit: (values: PaymentCategoryFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentCategoryFormValues>({
    resolver: zodResolver(paymentCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
      ...defaultValues,
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <TextField
        id="name"
        label="Category Name"
        placeholder="e.g. Marriage Assistance"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        id="description"
        label="Description"
        placeholder="Short internal description"
        error={errors.description?.message}
        {...register("description")}
      />
      <SelectField
        id="status"
        label="Status"
        placeholder="Select status"
        error={errors.status?.message}
        options={[
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
        ]}
        {...register("status")}
      />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button className="bg-slate-600 hover:bg-slate-700" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
