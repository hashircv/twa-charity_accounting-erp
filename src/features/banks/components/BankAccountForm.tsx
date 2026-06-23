import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const bankAccountSchema = z.object({
  assetHeadId: z.string().optional(),
  accountName: z.string().min(2, "Account name must be at least 2 characters"),
  accountNumber: z.string().min(4, "Account number must be at least 4 characters"),
  accountType: z.enum(["Kuwait Bank", "India Bank"], { required_error: "Select an account type" }),
  currency: z.enum(["KWD", "INR"], { required_error: "Select a currency" }),
  branch: z.string().min(1, "Branch is required"),
  openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative"),
  currentBalance: z.coerce.number().min(0, "Current balance cannot be negative"),
  reconciliationStatus: z.enum(["Matched", "Pending"], { required_error: "Select reconciliation status" }),
});

export type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

type AssetAccountHeadOption = {
  id: string;
  name: string;
  code: string;
};

interface BankAccountFormProps {
  assetAccountHeads?: AssetAccountHeadOption[];
  defaultValues?: Partial<BankAccountFormValues>;
  onSubmit: (values: BankAccountFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function BankAccountForm({ assetAccountHeads = [], defaultValues, onSubmit, onCancel, submitLabel = "Save" }: BankAccountFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      assetHeadId: "",
      accountName: "",
      accountNumber: "",
      accountType: undefined,
      currency: undefined,
      branch: "",
      openingBalance: 0,
      currentBalance: 0,
      reconciliationStatus: undefined,
      ...defaultValues,
    },
  });
  const selectedAssetHeadId = watch("assetHeadId");

  useEffect(() => {
    const selectedHead = assetAccountHeads.find((head) => head.id === selectedAssetHeadId);
    if (!selectedHead) return;
    setValue("accountName", selectedHead.name, { shouldDirty: true, shouldValidate: true });
    setValue("accountNumber", selectedHead.code, { shouldDirty: true, shouldValidate: true });
  }, [assetAccountHeads, selectedAssetHeadId, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <SelectField
        id="assetHeadId"
        label="Asset Account Head"
        placeholder="Select asset head"
        error={errors.assetHeadId?.message}
        searchable
        options={assetAccountHeads.map((head) => ({ value: head.id, label: `${head.code} / ${head.name}` }))}
        {...register("assetHeadId")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="accountName"
          label="Bank Name"
          placeholder="e.g. TWA Main Account"
          error={errors.accountName?.message}
          {...register("accountName")}
        />
        <TextField
          id="accountNumber"
          label="Account Number"
          placeholder="e.g. 1234567890"
          error={errors.accountNumber?.message}
          {...register("accountNumber")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="accountType"
          label="Account Type"
          placeholder="Select type"
          error={errors.accountType?.message}
          options={[
            { value: "Kuwait Bank", label: "Kuwait Bank" },
            { value: "India Bank", label: "India Bank" },
          ]}
          {...register("accountType")}
        />
        <SelectField
          id="currency"
          label="Currency"
          placeholder="Select currency"
          error={errors.currency?.message}
          options={[
            { value: "KWD", label: "KWD — Kuwaiti Dinar" },
            { value: "INR", label: "INR — Indian Rupee" },
          ]}
          {...register("currency")}
        />
      </div>

      <TextField
        id="branch"
        label="Branch"
        placeholder="e.g. Salmiya Branch"
        error={errors.branch?.message}
        {...register("branch")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          id="openingBalance"
          label="Opening Balance"
          step="0.001"
          error={errors.openingBalance?.message}
          {...register("openingBalance")}
        />
        <NumberField
          id="currentBalance"
          label="Current Balance"
          step="0.001"
          error={errors.currentBalance?.message}
          {...register("currentBalance")}
        />
      </div>

      <SelectField
        id="reconciliationStatus"
        label="Reconciliation Status"
        placeholder="Select status"
        error={errors.reconciliationStatus?.message}
        options={[
          { value: "Matched", label: "Matched" },
          { value: "Pending", label: "Pending" },
        ]}
        {...register("reconciliationStatus")}
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
