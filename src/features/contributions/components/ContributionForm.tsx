import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const contributionSchema = z.object({
  caseReferenceNumber: z.string().min(1, "Case reference number is required"),
  contributorName: z.string().min(2, "Contributor name must be at least 2 characters"),
  contributorRole: z.enum(
    ["Administrator", "President", "Secretary", "Treasurer", "Executive Member", "General Member"],
    { required_error: "Select a role" },
  ),
  contributionType: z.enum(["One-time", "Recurring"], { required_error: "Select contribution type" }),
  amount: z.object({
    originalAmount: z.coerce.number().min(0, "Amount cannot be negative"),
    currency: z.enum(["KWD", "INR"], { required_error: "Select a currency" }),
    exchangeRate: z.coerce.number().min(0, "Exchange rate cannot be negative"),
    convertedAmount: z.coerce.number().min(0, "Converted amount cannot be negative"),
  }),
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Cheque"], { required_error: "Select payment method" }),
  collectionStatus: z.enum(["Pledged", "Received", "Overdue"], { required_error: "Select collection status" }),
  narration: z.string().optional(),
});

export type ContributionFormValues = z.infer<typeof contributionSchema>;

interface ContributionFormProps {
  defaultValues?: Partial<ContributionFormValues>;
  onSubmit: (values: ContributionFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function ContributionForm({ defaultValues, onSubmit, onCancel, submitLabel = "Save" }: ContributionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      caseReferenceNumber: "",
      contributorName: "",
      contributorRole: undefined,
      contributionType: undefined,
      amount: { originalAmount: 0, currency: undefined, exchangeRate: 1, convertedAmount: 0 },
      paymentMethod: undefined,
      collectionStatus: undefined,
      narration: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="caseReferenceNumber"
          label="Case Reference Number"
          placeholder="e.g. CASE-2025-001"
          error={errors.caseReferenceNumber?.message}
          {...register("caseReferenceNumber")}
        />
        <TextField
          id="contributorName"
          label="Contributor Name"
          placeholder="e.g. Ahmed Al-Rashid"
          error={errors.contributorName?.message}
          {...register("contributorName")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="contributorRole"
          label="Contributor Role"
          placeholder="Select role"
          error={errors.contributorRole?.message}
          options={[
            { value: "Administrator", label: "Administrator" },
            { value: "President", label: "President" },
            { value: "Secretary", label: "Secretary" },
            { value: "Treasurer", label: "Treasurer" },
            { value: "Executive Member", label: "Executive Member" },
            { value: "General Member", label: "General Member" },
          ]}
          {...register("contributorRole")}
        />
        <SelectField
          id="contributionType"
          label="Contribution Type"
          placeholder="Select type"
          error={errors.contributionType?.message}
          options={[
            { value: "One-time", label: "One-time" },
            { value: "Recurring", label: "Recurring" },
          ]}
          {...register("contributionType")}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="paymentMethod"
          label="Payment Method"
          placeholder="Select method"
          error={errors.paymentMethod?.message}
          options={[
            { value: "Cash", label: "Cash" },
            { value: "Bank Transfer", label: "Bank Transfer" },
            { value: "Cheque", label: "Cheque" },
          ]}
          {...register("paymentMethod")}
        />
        <SelectField
          id="collectionStatus"
          label="Collection Status"
          placeholder="Select status"
          error={errors.collectionStatus?.message}
          options={[
            { value: "Pledged", label: "Pledged" },
            { value: "Received", label: "Received" },
            { value: "Overdue", label: "Overdue" },
          ]}
          {...register("collectionStatus")}
        />
      </div>

      <TextField
        id="narration"
        label="Narration"
        placeholder="Optional notes about this contribution"
        error={errors.narration?.message}
        {...register("narration")}
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
