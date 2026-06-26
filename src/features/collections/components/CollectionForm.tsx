import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { collectionSchema, type CollectionFormValues } from "@/features/collections/schemas/collectionSchema";

export function CollectionForm({
  onSubmit,
  submitLabel = "Create receipt",
  defaultValues,
  receiptNumber,
  categoryOptions,
  cashAccounts,
  bankAccounts,
  members,
}: {
  onSubmit: (values: CollectionFormValues) => void;
  submitLabel?: string;
  defaultValues?: Partial<CollectionFormValues>;
  receiptNumber: string;
  categoryOptions: string[];
  cashAccounts: { id: string; label: string }[];
  bankAccounts: { id: string; label: string }[];
  members?: { name: string; contactNumber: string; memberId: string }[];
}) {
  const { register, handleSubmit, formState, reset, watch, setValue } = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      currency: "KWD",
      amount: 0,
      kwdAmount: 0,
      inrAmount: 0,
      method: "Cash",
      category: categoryOptions[0] ?? "",
      collectedBy: "TWA Administrator",
      depositStatus: "With Treasurer",
      accountType: "Cash",
      accountId: cashAccounts[0]?.id ?? "",
      ...defaultValues,
    },
  });
  const accountType = watch("accountType");
  const donorName = watch("donorName");
  const kwdAmount = watch("kwdAmount");
  const inrAmount = watch("inrAmount");
  const accountOptions = accountType === "Bank" ? bankAccounts : cashAccounts;
  const [isDonorOpen, setIsDonorOpen] = useState(false);
  const donorNameField = register("donorName");
  const donorSuggestions = (members ?? []).filter((member) =>
    donorName?.trim() ? member.name.toLowerCase().includes(donorName.trim().toLowerCase()) : true,
  );

  useEffect(() => {
    const selectedMember = members?.find((member) => member.name.toLowerCase() === donorName?.trim().toLowerCase());
    if (!selectedMember) return;
    setValue("donorContact", selectedMember.contactNumber, { shouldValidate: true, shouldDirty: true });
  }, [donorName, members, setValue]);

  useEffect(() => {
    const kwd = Number(kwdAmount) || 0;
    const inr = Number(inrAmount) || 0;
    setValue("currency", kwd > 0 ? "KWD" : "INR", { shouldValidate: true, shouldDirty: true });
    setValue("amount", kwd > 0 ? kwd : inr, { shouldValidate: true, shouldDirty: true });
  }, [inrAmount, kwdAmount, setValue]);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={handleSubmit((values) => {
        onSubmit(values);
        reset({
          date: new Date().toISOString().slice(0, 10),
          currency: "KWD",
          amount: 0,
          kwdAmount: 0,
          inrAmount: 0,
          method: "Cash",
          category: categoryOptions[0] ?? "",
          collectedBy: "TWA Administrator",
          depositStatus: "With Treasurer",
          accountType: "Cash",
          accountId: cashAccounts[0]?.id ?? "",
        });
      })}
    >
      <TextField id="receiptNumber" label="Receipt Number" value={receiptNumber} readOnly />
      <TextField id="date" label="Date" type="date" error={formState.errors.date?.message} {...register("date")} />
      <div className="relative space-y-1">
        <label htmlFor="donorName" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Donor Name
        </label>
        <input
          id="donorName"
          className={`w-full rounded border border-slate-200 bg-white px-3 py-2 text-base outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-emerald-500 dark:focus:ring-emerald-500 sm:text-sm ${
            formState.errors.donorName ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
          }`}
          placeholder="Type donor or select member"
          autoComplete="off"
          {...donorNameField}
          onFocus={() => setIsDonorOpen(true)}
          onBlur={(event) => {
            donorNameField.onBlur(event);
            window.setTimeout(() => setIsDonorOpen(false), 120);
          }}
          onChange={(event) => {
            donorNameField.onChange(event);
            setIsDonorOpen(true);
          }}
        />
        {formState.errors.donorName?.message && <p className="text-xs text-red-600">{formState.errors.donorName.message}</p>}
        {isDonorOpen && donorSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-52 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
            {donorSuggestions.map((member) => (
              <button
                className="block w-full px-3 py-2 text-left text-base text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900 sm:text-sm"
                key={`${member.memberId}-${member.name}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValue("donorName", member.name, { shouldValidate: true, shouldDirty: true });
                  setValue("donorContact", member.contactNumber, { shouldValidate: true, shouldDirty: true });
                  setIsDonorOpen(false);
                }}
              >
                <span className="block font-medium">{member.name}</span>
                <span className="block break-words text-xs text-slate-500">{member.memberId} / {member.contactNumber}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <TextField id="donorContact" label="Donor Contact" placeholder="Donor contact" error={formState.errors.donorContact?.message} {...register("donorContact")} />
      <NumberField id="kwdAmount" label="KWD Amount" step="0.001" placeholder="KWD amount" error={formState.errors.kwdAmount?.message} {...register("kwdAmount")} />
      <NumberField id="inrAmount" label="INR Amount" step="0.001" placeholder="INR amount" error={formState.errors.inrAmount?.message} {...register("inrAmount")} />
      <SelectField
        id="category"
        label="Collection Category"
        options={categoryOptions.map((category) => ({ value: category, label: category }))}
        error={formState.errors.category?.message}
        searchable
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
        <Button className="w-full sm:w-auto" type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
