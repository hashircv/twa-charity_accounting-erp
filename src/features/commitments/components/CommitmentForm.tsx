import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const commitmentSchema = z.object({
  beneficiaryId: z.string().min(1, "Beneficiary ID is required"),
  category: z.string().min(1, "Category is required"),
  approvalDate: z.string().min(1, "Approval date is required"),
  approvedBy: z.string().min(1, "Approver name is required"),
  totalApproved: z.object({
    originalAmount: z.coerce.number().min(0, "Amount cannot be negative"),
    currency: z.enum(["KWD", "INR"], { required_error: "Select a currency" }),
    exchangeRate: z.coerce.number().min(0, "Exchange rate cannot be negative"),
    convertedAmount: z.coerce.number().min(0, "Converted amount cannot be negative"),
  }),
  amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
  remainingBalance: z.coerce.number().min(0, "Remaining balance cannot be negative"),
  futureLiability: z.coerce.number().min(0, "Future liability cannot be negative"),
  paymentFrequency: z.enum(["Monthly", "Quarterly", "One-time"], { required_error: "Select payment frequency" }),
  paymentPeriod: z.string().min(1, "Payment period is required"),
  status: z.enum(["Active", "Closed"], { required_error: "Select status" }),
});

export type CommitmentFormValues = z.infer<typeof commitmentSchema>;

interface CommitmentFormProps {
  defaultValues?: Partial<CommitmentFormValues>;
  onSubmit: (values: CommitmentFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function CommitmentForm({ defaultValues, onSubmit, onCancel, submitLabel = "Save" }: CommitmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CommitmentFormValues>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: {
      beneficiaryId: "",
      category: "",
      approvalDate: "",
      approvedBy: "",
      totalApproved: { originalAmount: 0, currency: undefined, exchangeRate: 1, convertedAmount: 0 },
      amountPaid: 0,
      remainingBalance: 0,
      futureLiability: 0,
      paymentFrequency: undefined,
      paymentPeriod: "",
      status: undefined,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="beneficiaryId"
          label="Beneficiary ID"
          placeholder="e.g. BEN-001"
          error={errors.beneficiaryId?.message}
          {...register("beneficiaryId")}
        />
        <TextField
          id="category"
          label="Category"
          placeholder="e.g. Education, Medical"
          error={errors.category?.message}
          {...register("category")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="approvalDate"
          label="Approval Date"
          type="date"
          error={errors.approvalDate?.message}
          {...register("approvalDate")}
        />
        <TextField
          id="approvedBy"
          label="Approved By"
          placeholder="e.g. President"
          error={errors.approvedBy?.message}
          {...register("approvedBy")}
        />
      </div>

      {/* Total approved amount section */}
      <fieldset className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-800">
        <legend className="px-1 text-xs font-medium text-slate-600 dark:text-slate-400">Total Approved Amount</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id="totalOriginalAmount"
            label="Original Amount"
            step="0.001"
            error={errors.totalApproved?.originalAmount?.message}
            {...register("totalApproved.originalAmount")}
          />
          <SelectField
            id="totalCurrency"
            label="Currency"
            placeholder="Select currency"
            error={errors.totalApproved?.currency?.message}
            options={[
              { value: "KWD", label: "KWD — Kuwaiti Dinar" },
              { value: "INR", label: "INR — Indian Rupee" },
            ]}
            {...register("totalApproved.currency")}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id="totalExchangeRate"
            label="Exchange Rate"
            step="0.0001"
            error={errors.totalApproved?.exchangeRate?.message}
            {...register("totalApproved.exchangeRate")}
          />
          <NumberField
            id="totalConvertedAmount"
            label="Converted Amount (INR)"
            step="0.001"
            error={errors.totalApproved?.convertedAmount?.message}
            {...register("totalApproved.convertedAmount")}
          />
        </div>
      </fieldset>

      {/* Payment tracking */}
      <fieldset className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-800">
        <legend className="px-1 text-xs font-medium text-slate-600 dark:text-slate-400">Payment Tracking</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberField
            id="amountPaid"
            label="Amount Paid"
            step="0.001"
            error={errors.amountPaid?.message}
            {...register("amountPaid")}
          />
          <NumberField
            id="remainingBalance"
            label="Remaining Balance"
            step="0.001"
            error={errors.remainingBalance?.message}
            {...register("remainingBalance")}
          />
          <NumberField
            id="futureLiability"
            label="Future Liability"
            step="0.001"
            error={errors.futureLiability?.message}
            {...register("futureLiability")}
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField
          id="paymentFrequency"
          label="Payment Frequency"
          placeholder="Select frequency"
          error={errors.paymentFrequency?.message}
          options={[
            { value: "Monthly", label: "Monthly" },
            { value: "Quarterly", label: "Quarterly" },
            { value: "One-time", label: "One-time" },
          ]}
          {...register("paymentFrequency")}
        />
        <TextField
          id="paymentPeriod"
          label="Payment Period"
          placeholder="e.g. Jan 2025 – Dec 2025"
          error={errors.paymentPeriod?.message}
          {...register("paymentPeriod")}
        />
        <SelectField
          id="status"
          label="Status"
          placeholder="Select status"
          error={errors.status?.message}
          options={[
            { value: "Active", label: "Active" },
            { value: "Closed", label: "Closed" },
          ]}
          {...register("status")}
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
