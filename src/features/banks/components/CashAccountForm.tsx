import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const cashAccountSchema = z.object({
  assetHeadId: z.string().optional(),
  userName: z.string().min(2, "User name must be at least 2 characters"),
  phoneNumber: z.string().min(6, "Phone number must be at least 6 characters"),
});

export type CashAccountFormValues = z.infer<typeof cashAccountSchema>;

type AssetAccountHeadOption = {
  id: string;
  name: string;
  code: string;
};

interface CashAccountFormProps {
  assetAccountHeads?: AssetAccountHeadOption[];
  defaultValues?: Partial<CashAccountFormValues>;
  onSubmit: (values: CashAccountFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function CashAccountForm({ assetAccountHeads = [], defaultValues, onSubmit, onCancel, submitLabel = "Save" }: CashAccountFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CashAccountFormValues>({
    resolver: zodResolver(cashAccountSchema),
    defaultValues: {
      assetHeadId: "",
      userName: "",
      phoneNumber: "",
      ...defaultValues,
    },
  });
  const selectedAssetHeadId = watch("assetHeadId");

  useEffect(() => {
    const selectedHead = assetAccountHeads.find((head) => head.id === selectedAssetHeadId);
    if (!selectedHead) return;
    setValue("userName", selectedHead.name, { shouldDirty: true, shouldValidate: true });
    setValue("phoneNumber", selectedHead.code, { shouldDirty: true, shouldValidate: true });
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
