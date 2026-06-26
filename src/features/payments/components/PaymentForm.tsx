import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const paymentSchema = z.object({
  voucherNumber: z.string().min(1, "Voucher number is required"),
  date: z.string().min(1, "Date is required"),
  beneficiaryId: z.string().min(1, "Beneficiary ID is required"),
  beneficiaryName: z.string().min(1, "Beneficiary name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.object({
    originalAmount: z.coerce.number().min(0, "Amount cannot be negative"),
    currency: z.enum(["KWD", "INR"], { required_error: "Select a currency" }),
    exchangeRate: z.coerce.number().min(0, "Exchange rate cannot be negative"),
    convertedAmount: z.coerce.number().min(0, "Converted amount cannot be negative"),
  }),
  method: z.enum(["Bank", "Cash"], { required_error: "Select payment method" }),
  accountId: z.string().min(1, "Select an account"),
  approvedBy: z.string().min(1, "Approver name is required"),
  paidBy: z.string().min(1, "Payer name is required"),
  narration: z.string().optional(),
  status: z.enum(["Pending", "Approved", "Paid"], { required_error: "Select status" }),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  defaultValues?: Partial<PaymentFormValues>;
  beneficiaries: { id: string; name: string; label: string }[];
  categoryOptions: string[];
  cashAccounts: { id: string; label: string }[];
  bankAccounts: { id: string; label: string }[];
  onSubmit: (values: PaymentFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function PaymentForm({
  defaultValues,
  beneficiaries,
  categoryOptions,
  cashAccounts,
  bankAccounts,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      voucherNumber: "",
      date: "",
      beneficiaryId: "",
      beneficiaryName: "",
      category: "",
      amount: { originalAmount: 0, currency: "INR", exchangeRate: 1, convertedAmount: 0 },
      method: undefined,
      accountId: "",
      approvedBy: "",
      paidBy: "",
      narration: "",
      status: undefined,
      ...defaultValues,
    },
  });
  const [kwdAmount, setKwdAmount] = useState(defaultValues?.amount?.currency === "KWD" ? defaultValues.amount.originalAmount : 0);
  const [inrAmount, setInrAmount] = useState(defaultValues?.amount?.convertedAmount ?? 0);
  const beneficiaryId = watch("beneficiaryId");
  const method = watch("method");
  const accountId = watch("accountId");
  const accountOptions = method === "Bank" ? bankAccounts : cashAccounts;

  useEffect(() => {
    const kwd = Number(kwdAmount) || 0;
    const inr = Number(inrAmount) || 0;
    setValue("amount.currency", kwd > 0 ? "KWD" : "INR", { shouldValidate: true, shouldDirty: true });
    setValue("amount.originalAmount", kwd > 0 ? kwd : inr, { shouldValidate: true, shouldDirty: true });
    setValue("amount.convertedAmount", inr, { shouldValidate: true, shouldDirty: true });
    setValue("amount.exchangeRate", kwd > 0 && inr > 0 ? Number((inr / kwd).toFixed(4)) : 1, { shouldValidate: true, shouldDirty: true });
  }, [inrAmount, kwdAmount, setValue]);

  useEffect(() => {
    if (!method) return;
    if (!accountOptions.some((account) => account.id === accountId)) {
      setValue("accountId", accountOptions[0]?.id ?? "", { shouldValidate: true, shouldDirty: true });
    }
  }, [accountId, accountOptions, method, setValue]);

  useEffect(() => {
    const beneficiary = beneficiaries.find((item) => item.id === beneficiaryId);
    if (beneficiary) {
      setValue("beneficiaryName", beneficiary.name, { shouldValidate: true, shouldDirty: true });
    }
  }, [beneficiaries, beneficiaryId, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField id="voucherNumber" label="Voucher Number" placeholder="Auto generated" readOnly error={errors.voucherNumber?.message} {...register("voucherNumber")} />
        <TextField id="date" label="Date" type="date" error={errors.date?.message} {...register("date")} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="beneficiaryId"
          label="Beneficiary ID"
          placeholder="Select beneficiary"
          error={errors.beneficiaryId?.message}
          options={beneficiaries.map((beneficiary) => ({ value: beneficiary.id, label: beneficiary.label }))}
          searchable
          {...register("beneficiaryId")}
        />
        <TextField id="beneficiaryName" label="Beneficiary Name" placeholder="Fetched from beneficiary master" readOnly error={errors.beneficiaryName?.message} {...register("beneficiaryName")} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="category"
          label="Category"
          placeholder="Select payment category"
          error={errors.category?.message}
          options={categoryOptions.map((category) => ({ value: category, label: category }))}
          searchable
          {...register("category")}
        />
      </div>

      <fieldset className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-800">
        <legend className="px-1 text-xs font-medium text-slate-600 dark:text-slate-400">Amount Details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField id="kwdAmount" label="KWD Amount" step="0.001" value={kwdAmount} onChange={(event) => setKwdAmount(Number(event.target.value) || 0)} />
          <NumberField id="inrAmount" label="INR Amount" step="0.001" value={inrAmount} error={errors.amount?.convertedAmount?.message} onChange={(event) => setInrAmount(Number(event.target.value) || 0)} />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField
          id="method"
          label="Payment Method"
          placeholder="Select method"
          error={errors.method?.message}
          options={[
            { value: "Bank", label: "Bank" },
            { value: "Cash", label: "Cash" },
          ]}
          {...register("method")}
        />
        <SelectField
          id="accountId"
          label={method === "Bank" ? "Bank Account" : "Cash Account"}
          placeholder={`Select ${method === "Bank" ? "bank account" : "cash account"}`}
          error={errors.accountId?.message}
          options={accountOptions.map((account) => ({ value: account.id, label: account.label }))}
          searchable
          {...register("accountId")}
        />
        <SelectField
          id="status"
          label="Status"
          placeholder="Select status"
          error={errors.status?.message}
          options={[
            { value: "Pending", label: "Pending" },
            { value: "Approved", label: "Approved" },
            { value: "Paid", label: "Paid" },
          ]}
          {...register("status")}
        />
        <TextField id="approvedBy" label="Approved By" placeholder="e.g. President" error={errors.approvedBy?.message} {...register("approvedBy")} />
      </div>

      <TextField id="paidBy" label="Paid By" placeholder="e.g. Treasurer" error={errors.paidBy?.message} {...register("paidBy")} />
      <TextField id="narration" label="Narration" placeholder="Optional notes about this payment" error={errors.narration?.message} {...register("narration")} />

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
