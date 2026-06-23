import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const assistanceSchema = z.object({
  assistanceId: z.string().min(1, "Assistance ID is required"),
  beneficiaryId: z.string().min(1, "Beneficiary ID is required"),
  beneficiaryName: z.string().min(2, "Name must be at least 2 characters"),
  category: z.enum(
    [
      "Monthly Food Kit",
      "Monthly Medical Aid",
      "Medical Emergency",
      "Widow Pension",
      "Self Employment Support",
      "Education Assistance",
      "Debt Clearance",
      "House Maintenance",
      "Dialysis Assistance",
      "Ramadan Kit",
      "Eid Kit",
      "Social Commitment",
      "Disabled Community Support",
    ],
    { required_error: "Select a category" },
  ),
  amount: z.object({
    originalAmount: z.coerce.number().min(0, "Amount cannot be negative"),
    currency: z.enum(["KWD", "INR"], { required_error: "Select a currency" }),
    exchangeRate: z.coerce.number().min(0, "Exchange rate cannot be negative"),
    convertedAmount: z.coerce.number().min(0, "Converted amount cannot be negative"),
  }),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryMethod: z.enum(["Cash", "Bank Transfer", "In-Kind"], { required_error: "Select delivery method" }),
  approvedBy: z.string().min(1, "Approver is required"),
  handledBy: z.string().min(1, "Handler is required"),
  narration: z.string().optional(),
  status: z.enum(["Pending", "Approved", "Delivered", "Cancelled"], { required_error: "Select status" }),
});

export type AssistanceFormValues = z.infer<typeof assistanceSchema>;

interface AssistanceFormProps {
  defaultValues?: Partial<AssistanceFormValues>;
  onSubmit: (values: AssistanceFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function AssistanceForm({ defaultValues, onSubmit, onCancel, submitLabel = "Save" }: AssistanceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceSchema),
    defaultValues: {
      assistanceId: "",
      beneficiaryId: "",
      beneficiaryName: "",
      category: undefined,
      amount: { originalAmount: 0, currency: undefined, exchangeRate: 1, convertedAmount: 0 },
      deliveryDate: "",
      deliveryMethod: undefined,
      approvedBy: "",
      handledBy: "",
      narration: "",
      status: undefined,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          id="assistanceId"
          label="Assistance ID"
          placeholder="e.g. TWA-A-0001"
          error={errors.assistanceId?.message}
          {...register("assistanceId")}
        />
        <TextField
          id="beneficiaryId"
          label="Beneficiary ID"
          placeholder="e.g. TWA-B-0001"
          error={errors.beneficiaryId?.message}
          {...register("beneficiaryId")}
        />
        <TextField
          id="beneficiaryName"
          label="Beneficiary Name"
          placeholder="e.g. Mohamed Ali"
          error={errors.beneficiaryName?.message}
          {...register("beneficiaryName")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="category"
          label="Assistance Category"
          placeholder="Select category"
          error={errors.category?.message}
          options={[
            { value: "Monthly Food Kit", label: "Monthly Food Kit" },
            { value: "Monthly Medical Aid", label: "Monthly Medical Aid" },
            { value: "Medical Emergency", label: "Medical Emergency" },
            { value: "Widow Pension", label: "Widow Pension" },
            { value: "Self Employment Support", label: "Self Employment Support" },
            { value: "Education Assistance", label: "Education Assistance" },
            { value: "Debt Clearance", label: "Debt Clearance" },
            { value: "House Maintenance", label: "House Maintenance" },
            { value: "Dialysis Assistance", label: "Dialysis Assistance" },
            { value: "Ramadan Kit", label: "Ramadan Kit" },
            { value: "Eid Kit", label: "Eid Kit" },
            { value: "Social Commitment", label: "Social Commitment" },
            { value: "Disabled Community Support", label: "Disabled Community Support" },
          ]}
          {...register("category")}
        />
        <SelectField
          id="status"
          label="Status"
          placeholder="Select status"
          error={errors.status?.message}
          options={[
            { value: "Pending", label: "Pending" },
            { value: "Approved", label: "Approved" },
            { value: "Delivered", label: "Delivered" },
            { value: "Cancelled", label: "Cancelled" },
          ]}
          {...register("status")}
        />
      </div>

      {/* Amount section */}
      <fieldset className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-800">
        <legend className="px-1 text-xs font-medium text-slate-600 dark:text-slate-400">Amount Details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id="originalAmount"
            label="Original Amount"
            step="0.001"
            error={errors.amount?.originalAmount?.message}
            {...register("amount.originalAmount")}
          />
          <SelectField
            id="amountCurrency"
            label="Currency"
            placeholder="Select currency"
            error={errors.amount?.currency?.message}
            options={[
              { value: "KWD", label: "KWD — Kuwaiti Dinar" },
              { value: "INR", label: "INR — Indian Rupee" },
            ]}
            {...register("amount.currency")}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id="exchangeRate"
            label="Exchange Rate"
            step="0.0001"
            error={errors.amount?.exchangeRate?.message}
            {...register("amount.exchangeRate")}
          />
          <NumberField
            id="convertedAmount"
            label="Converted Amount (INR)"
            step="0.001"
            error={errors.amount?.convertedAmount?.message}
            {...register("amount.convertedAmount")}
          />
        </div>
      </fieldset>

      {/* Delivery details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          id="deliveryDate"
          label="Delivery Date"
          type="date"
          error={errors.deliveryDate?.message}
          {...register("deliveryDate")}
        />
        <SelectField
          id="deliveryMethod"
          label="Delivery Method"
          placeholder="Select method"
          error={errors.deliveryMethod?.message}
          options={[
            { value: "Cash", label: "Cash" },
            { value: "Bank Transfer", label: "Bank Transfer" },
            { value: "In-Kind", label: "In-Kind" },
          ]}
          {...register("deliveryMethod")}
        />
        <TextField
          id="approvedBy"
          label="Approved By"
          placeholder="e.g. President"
          error={errors.approvedBy?.message}
          {...register("approvedBy")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="handledBy"
          label="Handled By"
          placeholder="e.g. Executive Member"
          error={errors.handledBy?.message}
          {...register("handledBy")}
        />
        <TextField
          id="narration"
          label="Narration"
          placeholder="Optional notes about this assistance"
          error={errors.narration?.message}
          {...register("narration")}
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
