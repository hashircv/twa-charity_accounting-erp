import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField, TextField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";

const beneficiarySchema = z.object({
  beneficiaryId: z.string().min(1, "Beneficiary ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  familyDetails: z.string().min(1, "Family details are required"),
  address: z.string().min(1, "Address is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountNumber: z.string().min(1, "Bank account number is required"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  branchName: z.string().min(1, "Branch name is required"),
  location: z.string().min(1, "Location is required"),
  incomeStatus: z.enum(["No Income", "Low Income", "Irregular Income"], { required_error: "Select income status" }),
  category: z.string().min(1, "Category is required"),
  caseDocuments: z.any().optional(),
  approvalAssignedTo: z.string().min(1, "Select who should approve this case"),
  requestDate: z.string().min(1, "Request date is required"),
  status: z.enum(["Pending", "Approved", "Active", "Closed"], { required_error: "Select status" }),
});

export type BeneficiaryFormValues = z.infer<typeof beneficiarySchema>;

function documentNames(documents: unknown) {
  if (documents instanceof FileList) {
    return Array.from(documents).map((file) => file.name);
  }
  if (typeof documents === "string") {
    return documents.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Convert form values to domain shape (caseDocuments as uploaded file names) */
export const toBeneficiaryPayload = (values: BeneficiaryFormValues) => ({
  ...values,
  caseDocuments: documentNames(values.caseDocuments),
});

/** Convert domain entity to form default values (caseDocuments as comma-separated string) */
export const fromBeneficiaryEntity = (entity: {
  beneficiaryId: string;
  name: string;
  familyDetails: string;
  address: string;
  mobileNumber: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  branchName: string;
  location: string;
  incomeStatus: "No Income" | "Low Income" | "Irregular Income";
  category: string;
  caseDocuments: string[];
  approvalAssignedTo: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Active" | "Closed";
}): Partial<BeneficiaryFormValues> => ({
  ...entity,
  caseDocuments: undefined,
});

interface BeneficiaryFormProps {
  defaultValues?: Partial<BeneficiaryFormValues>;
  categoryOptions: string[];
  onSubmit: (values: BeneficiaryFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
  beneficiaryIdLocked?: boolean;
}

export function BeneficiaryForm({
  defaultValues,
  categoryOptions,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  beneficiaryIdLocked = false,
}: BeneficiaryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BeneficiaryFormValues>({
    resolver: zodResolver(beneficiarySchema),
    defaultValues: {
      beneficiaryId: "",
      name: "",
      familyDetails: "",
      address: "",
      mobileNumber: "",
      bankName: "",
      bankAccountNumber: "",
      ifscCode: "",
      branchName: "",
      location: "",
      incomeStatus: undefined,
      category: "",
      caseDocuments: undefined,
      approvalAssignedTo: "Administrator",
      requestDate: new Date().toISOString().slice(0, 10),
      status: "Pending",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="beneficiaryId"
          label="Beneficiary ID"
          placeholder="Generated automatically"
          readOnly={beneficiaryIdLocked}
          error={errors.beneficiaryId?.message}
          {...register("beneficiaryId")}
        />
        <TextField
          id="name"
          label="Name"
          placeholder="Full name"
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      <TextField
        id="familyDetails"
        label="Family Details"
        placeholder="e.g. 4 members, 2 children"
        error={errors.familyDetails?.message}
        {...register("familyDetails")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="address"
          label="Address"
          placeholder="Full address"
          error={errors.address?.message}
          {...register("address")}
        />
        <TextField
          id="mobileNumber"
          label="Mobile Number"
          placeholder="e.g. +91 9876543210"
          error={errors.mobileNumber?.message}
          {...register("mobileNumber")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="bankName"
          label="Bank Name"
          placeholder="e.g. State Bank of India"
          error={errors.bankName?.message}
          {...register("bankName")}
        />
        <TextField
          id="bankAccountNumber"
          label="Bank Account Number"
          placeholder="Account number"
          error={errors.bankAccountNumber?.message}
          {...register("bankAccountNumber")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="ifscCode"
          label="IFSC Code"
          placeholder="e.g. SBIN0001234"
          error={errors.ifscCode?.message}
          {...register("ifscCode")}
        />
        <TextField
          id="branchName"
          label="Branch Name"
          placeholder="e.g. Thrissur Main Branch"
          error={errors.branchName?.message}
          {...register("branchName")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="location"
          label="Location"
          placeholder="e.g. Thrissur, Kerala"
          error={errors.location?.message}
          {...register("location")}
        />
        <SelectField
          id="incomeStatus"
          label="Income Status"
          placeholder="Select income status"
          error={errors.incomeStatus?.message}
          options={[
            { value: "No Income", label: "No Income" },
            { value: "Low Income", label: "Low Income" },
            { value: "Irregular Income", label: "Irregular Income" },
          ]}
          {...register("incomeStatus")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          id="category"
          label="Category"
          placeholder="Select category"
          error={errors.category?.message}
          options={categoryOptions.map((category) => ({ value: category, label: category }))}
          {...register("category")}
        />
        <SelectField
          id="approvalAssignedTo"
          label="Approval Directed To"
          placeholder="Select approver"
          error={errors.approvalAssignedTo?.message}
          options={[
            { value: "Administrator", label: "Administrator" },
            { value: "President", label: "President" },
            { value: "Secretary", label: "Secretary" },
            { value: "Treasurer", label: "Treasurer" },
          ]}
          {...register("approvalAssignedTo")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="requestDate"
          label="Request Date"
          type="date"
          error={errors.requestDate?.message}
          {...register("requestDate")}
        />
        <SelectField
          id="status"
          label="Approval Status"
          placeholder="Select status"
          error={errors.status?.message}
          options={[
            { value: "Pending", label: "Pending Approval" },
            { value: "Approved", label: "Approved" },
            { value: "Active", label: "Active" },
            { value: "Closed", label: "Closed" },
          ]}
          {...register("status")}
        />
      </div>

      <TextField
        id="caseDocuments"
        label="Case Documents"
        type="file"
        multiple
        error={typeof errors.caseDocuments?.message === "string" ? errors.caseDocuments.message : undefined}
        {...register("caseDocuments")}
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
