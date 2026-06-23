import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Trash2, UserRound } from "lucide-react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const memberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  profilePhoto: z.string().optional(),
  age: z.coerce.number().int("Age must be a whole number").min(1, "Age is required").max(120, "Enter a valid age"),
  contactNumber: z.string().min(1, "Contact number is required"),
  whatsappNumber: z.string().min(1, "WhatsApp number is required"),
  kuwaitAddress: z.string().min(1, "Kuwait address is required"),
  civilId: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
  role: z.enum(
    ["Administrator", "President", "Secretary", "Treasurer", "Executive Member", "General Member"],
    { required_error: "Select a role" },
  ),
  status: z.enum(["Active", "Inactive"], { required_error: "Select a status" }),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>;
  onSubmit: (values: MemberFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  memberIdLocked?: boolean;
}

export function MemberForm({ defaultValues, onSubmit, onCancel, submitLabel = "Save", memberIdLocked = false }: MemberFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      memberId: "",
      name: "",
      profilePhoto: "",
      age: 18,
      contactNumber: "",
      whatsappNumber: "",
      kuwaitAddress: "",
      civilId: "",
      joiningDate: "",
      role: undefined,
      status: undefined,
      ...defaultValues,
    },
  });
  const profilePhoto = watch("profilePhoto");

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("profilePhoto", { message: "Upload a valid image file" });
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("profilePhoto", { message: "Image must be 1 MB or smaller" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValue("profilePhoto", String(reader.result), { shouldDirty: true, shouldValidate: true });
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded border border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Member profile preview" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-10 w-10" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile Photo</p>
            <p className="mt-1 text-sm text-slate-500">Upload a clear member photo. JPG, PNG, or WebP up to 1 MB.</p>
            {errors.profilePhoto?.message && <p className="mt-2 text-sm text-red-600">{errors.profilePhoto.message}</p>}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
                <ImagePlus className="h-4 w-4" />
                Upload photo
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
              </label>
              {profilePhoto && (
                <Button
                  className="bg-slate-600 hover:bg-slate-700"
                  type="button"
                  onClick={() => setValue("profilePhoto", "", { shouldDirty: true, shouldValidate: true })}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="memberId"
          label="Member ID"
          placeholder="Generated automatically"
          readOnly={memberIdLocked}
          error={errors.memberId?.message}
          {...register("memberId")}
        />
        <TextField
          id="name"
          label="Full Name"
          placeholder="e.g. Ahmed Al-Rashid"
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          id="age"
          label="Age"
          min="1"
          max="120"
          step="1"
          error={errors.age?.message}
          {...register("age")}
        />
        <TextField
          id="contactNumber"
          label="Contact Number"
          placeholder="e.g. +965 9876 5432"
          error={errors.contactNumber?.message}
          {...register("contactNumber")}
        />
        <TextField
          id="whatsappNumber"
          label="WhatsApp Number"
          placeholder="e.g. +965 9876 5432"
          error={errors.whatsappNumber?.message}
          {...register("whatsappNumber")}
        />
      </div>

      <TextField
        id="kuwaitAddress"
        label="Kuwait Address"
        placeholder="e.g. Block 5, Salwa, Kuwait"
        error={errors.kuwaitAddress?.message}
        {...register("kuwaitAddress")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="civilId"
          label="Civil ID"
          placeholder="Optional — 12-digit civil ID"
          error={errors.civilId?.message}
          {...register("civilId")}
        />
        <TextField
          id="joiningDate"
          label="Joining Date"
          type="date"
          error={errors.joiningDate?.message}
          {...register("joiningDate")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="role"
          label="Role"
          placeholder="Select role"
          error={errors.role?.message}
          options={[
            { value: "Administrator", label: "Administrator" },
            { value: "President", label: "President" },
            { value: "Secretary", label: "Secretary" },
            { value: "Treasurer", label: "Treasurer" },
            { value: "Executive Member", label: "Executive Member" },
            { value: "General Member", label: "General Member" },
          ]}
          {...register("role")}
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
