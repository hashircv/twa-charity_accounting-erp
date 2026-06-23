import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { collectionSchema, type CollectionFormValues } from "@/features/collections/schemas/collectionSchema";

const categories = [
  "Membership Fee",
  "Monthly Subscription",
  "Ramadan Collection",
  "General Charity Collection",
  "Bank Interest Income",
  "Chitty Income",
  "Coin Box",
  "Other Income",
];

export function CollectionForm({
  onSubmit,
  submitLabel = "Create receipt",
  defaultValues,
  receiptNumber,
  cashAccounts,
  bankAccounts,
}: {
  onSubmit: (values: CollectionFormValues) => void;
  submitLabel?: string;
  defaultValues?: Partial<CollectionFormValues>;
  receiptNumber: string;
  cashAccounts: { id: string; label: string }[];
  bankAccounts: { id: string; label: string }[];
}) {
  const { register, handleSubmit, formState, reset, watch, setValue } = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      currency: "KWD",
      method: "Cash",
      category: "Membership Fee",
      collectedBy: "TWA Administrator",
      depositStatus: "With Treasurer",
      accountType: "Cash",
      accountId: cashAccounts[0]?.id ?? "",
      ...defaultValues,
    },
  });
  const accountType = watch("accountType");
  const accountOptions = accountType === "Bank" ? bankAccounts : cashAccounts;

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={handleSubmit((values) => {
        onSubmit(values);
        reset({
          date: new Date().toISOString().slice(0, 10),
          currency: "KWD",
          method: "Cash",
          category: "Membership Fee",
          collectedBy: "TWA Administrator",
          depositStatus: "With Treasurer",
          accountType: "Cash",
          accountId: cashAccounts[0]?.id ?? "",
        });
      })}
    >
      <TextField id="receiptNumber" label="Receipt Number" value={receiptNumber} readOnly />
      <TextField id="date" label="Date" type="date" error={formState.errors.date?.message} {...register("date")} />
      <TextField id="donorName" label="Donor Name" placeholder="Donor name" error={formState.errors.donorName?.message} {...register("donorName")} />
      <TextField id="donorContact" label="Donor Contact" placeholder="Donor contact" error={formState.errors.donorContact?.message} {...register("donorContact")} />
      <SelectField
        id="currency"
        label="Currency"
        options={[
          { value: "KWD", label: "KWD" },
          { value: "INR", label: "INR" },
        ]}
        error={formState.errors.currency?.message}
        {...register("currency")}
      />
      <NumberField id="amount" label="Amount" step="0.001" placeholder="Amount" error={formState.errors.amount?.message} {...register("amount")} />
      <SelectField
        id="category"
        label="Collection Category"
        options={categories.map((category) => ({ value: category, label: category }))}
        error={formState.errors.category?.message}
        {...register("category")}
      />
      <TextField id="collectedBy" label="Collected By" placeholder="Collector name" error={formState.errors.collectedBy?.message} {...register("collectedBy")} />
      <SelectField
        id="method"
        label="Collection Method"
        options={[
          { value: "Cash", label: "Cash" },
          { value: "Bank Transfer", label: "Bank Transfer" },
          { value: "Cheque", label: "Cheque" },
        ]}
        error={formState.errors.method?.message}
        {...register("method")}
      />
      <SelectField
        id="depositStatus"
        label="Deposit Status"
        options={[
          { value: "With Executive", label: "With Executive" },
          { value: "With Treasurer", label: "With Treasurer" },
          { value: "Deposited", label: "Deposited" },
        ]}
        error={formState.errors.depositStatus?.message}
        {...register("depositStatus")}
      />
      <SelectField
        id="accountType"
        label="Receipt Account Type"
        options={[
          { value: "Cash", label: "Cash Account" },
          { value: "Bank", label: "Bank Account" },
        ]}
        error={formState.errors.accountType?.message}
        {...register("accountType")}
        onChange={(event) => {
          const nextType = event.target.value as CollectionFormValues["accountType"];
          const nextOptions = nextType === "Bank" ? bankAccounts : cashAccounts;
          setValue("accountType", nextType, { shouldValidate: true, shouldDirty: true });
          setValue("accountId", nextOptions[0]?.id ?? "", { shouldValidate: true, shouldDirty: true });
        }}
      />
      <SelectField
        id="accountId"
        label={accountType === "Bank" ? "Bank Account" : "Cash Account"}
        placeholder={`Select ${accountType === "Bank" ? "bank account" : "cash account"}`}
        options={accountOptions.map((account) => ({ value: account.id, label: account.label }))}
        error={formState.errors.accountId?.message}
        {...register("accountId")}
      />
      <div className="space-y-1 md:col-span-2">
        <label htmlFor="narration" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Narration
        </label>
        <textarea
          id="narration"
          className="w-full rounded border border-slate-200 px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-950 sm:text-sm"
          placeholder="Narration"
          {...register("narration")}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
