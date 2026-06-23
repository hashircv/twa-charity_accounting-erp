import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, ChevronDown, CopyPlus, CreditCard, FileText, Landmark, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Modal } from "@/components/modals/Modal";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useToast } from "@/components/ui/Toaster";
import {
  beneficiaryDueStorageKey,
  createBeneficiaryDue,
  getBeneficiaryDues,
  getBeneficiaryPaymentLogs,
  type BeneficiaryPaymentDue,
  type BeneficiaryPaymentLog,
} from "@/features/beneficiaries/beneficiaryDueStore";
import { defaultPaymentCategoryNames, normalizePaymentCategory } from "@/features/paymentCategories/paymentCategoryDefaults";
import { useAppSelector } from "@/hooks/redux";
import { beneficiarySelectors, paymentCategorySelectors } from "@/store/selectors";
import { formatCurrency } from "@/utils/currency";

const beneficiaryDueSchema = z
  .object({
    category: z.string().min(1, "Select category"),
    supportType: z.enum(["Monthly", "Quarterly", "Yearly", "One-time"], { required_error: "Select support type" }),
    fromDate: z.string().min(1, "From date is required"),
    toDate: z.string().optional(),
    amount: z.coerce.number().min(1, "Amount must be greater than zero"),
  })
  .superRefine((values, context) => {
    if (values.toDate && new Date(values.toDate) < new Date(values.fromDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "To date must be after from date",
        path: ["toDate"],
      });
    }
  });

type BeneficiaryDueFormValues = z.infer<typeof beneficiaryDueSchema>;
type DetailField = { label: string; value: string };

function DetailSection({ title, fields }: { title: string; fields: DetailField[] }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div className="rounded border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40" key={field.label}>
            <p className="text-xs font-medium text-slate-500">{field.label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{field.value || "-"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BeneficiaryDueForm({
  defaultCategory,
  categoryOptions,
  onSubmit,
  onCancel,
}: {
  defaultCategory: string;
  categoryOptions: string[];
  onSubmit: (values: BeneficiaryDueFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BeneficiaryDueFormValues>({
    resolver: zodResolver(beneficiaryDueSchema),
    defaultValues: {
      category: defaultCategory,
      supportType: "Monthly",
      fromDate: new Date().toISOString().slice(0, 10),
      toDate: "",
      amount: 0,
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          id="supportType"
          label="Type"
          placeholder="Select type"
          error={errors.supportType?.message}
          options={[
            { value: "Monthly", label: "Monthly" },
            { value: "Quarterly", label: "Quarterly" },
            { value: "Yearly", label: "Yearly" },
            { value: "One-time", label: "One-time" },
          ]}
          {...register("supportType")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="fromDate"
          label="From Date"
          type="date"
          error={errors.fromDate?.message}
          {...register("fromDate")}
        />
        <TextField
          id="toDate"
          label="To Date"
          type="date"
          error={errors.toDate?.message}
          {...register("toDate")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          id="amount"
          label="Amount"
          min="1"
          step="0.01"
          error={errors.amount?.message}
          {...register("amount")}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button className="bg-slate-600 hover:bg-slate-700" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Create due
        </Button>
      </div>
    </form>
  );
}

export default function BeneficiaryDetailPage() {
  const { beneficiaryId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const beneficiaries = useAppSelector(beneficiarySelectors.selectAll);
  const paymentCategories = useAppSelector(paymentCategorySelectors.selectAll);
  const beneficiary = beneficiaries.find((item) => item.id === beneficiaryId);
  const [isCreatingDue, setIsCreatingDue] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [dues, setDues] = useState<BeneficiaryPaymentDue[]>(() => (beneficiaryId ? getBeneficiaryDues(beneficiaryId) : []));
  const [paymentLogs, setPaymentLogs] = useState<BeneficiaryPaymentLog[]>(() => (beneficiaryId ? getBeneficiaryPaymentLogs(beneficiaryId) : []));

  useEffect(() => {
    if (!beneficiaryId) return;
    const refreshDues = () => {
      setDues(getBeneficiaryDues(beneficiaryId));
      setPaymentLogs(getBeneficiaryPaymentLogs(beneficiaryId));
    };

    refreshDues();
    const syncDues = (event: StorageEvent) => {
      if (event.key === beneficiaryDueStorageKey) refreshDues();
    };
    window.addEventListener("storage", syncDues);
    return () => window.removeEventListener("storage", syncDues);
  }, [beneficiaryId]);

  const totals = useMemo(
    () => ({
      approved: dues.reduce((total, due) => total + due.amount, 0),
      paid: dues.reduce((total, due) => total + due.paidAmount, 0),
      due: dues.reduce((total, due) => total + due.dueAmount, 0),
    }),
    [dues],
  );
  const displayedDues = useMemo(
    () =>
      [...dues].sort((first, second) => {
        if (first.status !== second.status) return first.status === "Due" ? -1 : 1;
        return new Date(first.fromDate).getTime() - new Date(second.fromDate).getTime();
      }),
    [dues],
  );
  const activeCategoryOptions = useMemo(
    () => paymentCategories.filter((item) => item.status === "Active").map((item) => item.name),
    [paymentCategories],
  );
  const categoryOptions = activeCategoryOptions.length ? activeCategoryOptions : defaultPaymentCategoryNames;

  const handleCreateDue = (values: BeneficiaryDueFormValues) => {
    if (!beneficiaryId) return;
    const generatedDues = createBeneficiaryDue(beneficiaryId, values);
    setDues(getBeneficiaryDues(beneficiaryId));
    notify({
      tone: "success",
      title: "Payment due created",
      description: `${generatedDues.length} due record${generatedDues.length === 1 ? "" : "s"} generated.`,
    });
    setIsCreatingDue(false);
  };

  const openPaymentForDue = (due: BeneficiaryPaymentDue) => {
    navigate("/payments", {
      state: {
        beneficiaryDuePayment: {
          dueId: due.id,
          beneficiaryEntityId: beneficiary?.id ?? "",
          beneficiaryId: beneficiary?.beneficiaryId ?? "",
          beneficiaryName: beneficiary?.name ?? "Beneficiary",
          beneficiaryMobile: beneficiary?.mobileNumber ?? "",
          category: due.category,
          supportType: due.supportType,
          fromDate: due.fromDate,
          toDate: due.toDate,
          amount: due.dueAmount,
        },
      },
    });
  };

  const columns: ColumnDef<BeneficiaryPaymentDue>[] = [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "supportType", header: "Type" },
    { accessorKey: "fromDate", header: "From Date", cell: ({ row }) => new Date(row.original.fromDate).toLocaleDateString() },
    { accessorKey: "toDate", header: "To Date", cell: ({ row }) => new Date(row.original.toDate).toLocaleDateString() },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount, "INR") },
    { accessorKey: "paidAmount", header: "Paid", cell: ({ row }) => formatCurrency(row.original.paidAmount, "INR") },
    { accessorKey: "dueAmount", header: "Payment Due", cell: ({ row }) => formatCurrency(row.original.dueAmount, "INR") },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <button
          className="inline-flex h-8 items-center gap-2 rounded border border-slate-200 px-2 text-sm font-semibold text-emerald-700 disabled:opacity-40 dark:border-slate-800"
          onClick={() => openPaymentForDue(row.original)}
          disabled={row.original.dueAmount <= 0}
          type="button"
        >
          <CreditCard className="h-4 w-4" />
          {row.original.dueAmount <= 0 ? "Paid" : "Pay"}
        </button>
      ),
    },
  ];
  const paymentLogColumns: ColumnDef<BeneficiaryPaymentLog>[] = [
    { accessorKey: "voucherNumber", header: "Voucher" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "supportType", header: "Type" },
    { accessorKey: "fromDate", header: "From Date", cell: ({ row }) => new Date(row.original.fromDate).toLocaleDateString() },
    { accessorKey: "toDate", header: "To Date", cell: ({ row }) => new Date(row.original.toDate).toLocaleDateString() },
    { accessorKey: "amount", header: "Paid", cell: ({ row }) => formatCurrency(row.original.amount, "INR") },
  ];

  if (!beneficiary) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" to="/beneficiaries">
          <ArrowLeft className="h-4 w-4" />
          Back to beneficiaries
        </Link>
        <Card className="p-4 text-sm text-slate-500">Beneficiary not found.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" to="/beneficiaries">
            <ArrowLeft className="h-4 w-4" />
            Back to beneficiaries
          </Link>
          <h2 className="text-xl font-bold">{beneficiary.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{beneficiary.beneficiaryId} / {beneficiary.mobileNumber}</p>
        </div>
        <Button type="button" onClick={() => setIsCreatingDue(true)}>
          <CopyPlus className="h-4 w-4" />
          Create payment due
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {[
          { label: "Total Approved", value: formatCurrency(totals.approved, "INR"), detail: "Payment dues created" },
          { label: "Total Paid", value: formatCurrency(totals.paid, "INR"), detail: "Payments released" },
          { label: "Payment Due", value: formatCurrency(totals.due, "INR"), detail: "Outstanding balance" },
          { label: "Due Records", value: String(dues.length), detail: "Assistance entries" },
        ].map((item) => (
          <Card className="p-3 sm:p-4" key={item.label}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 break-words text-base font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{item.detail}</p>
              </div>
              <div className="hidden h-9 w-9 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 sm:grid">
                <CopyPlus className="h-4 w-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block">
        <SummaryCards
          items={[
            { label: "Total Approved", value: formatCurrency(totals.approved, "INR"), detail: "Payment dues created", icon: CopyPlus },
            { label: "Total Paid", value: formatCurrency(totals.paid, "INR"), detail: "Payments released", icon: CopyPlus },
            { label: "Payment Due", value: formatCurrency(totals.due, "INR"), detail: "Outstanding balance", icon: CopyPlus },
            { label: "Due Records", value: String(dues.length), detail: "Assistance entries", icon: CopyPlus },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader title="Beneficiary Profile" />
          <div className="space-y-5 p-4">
            <div className="rounded border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Beneficiary Record</p>
                    <h3 className="mt-1 break-words text-lg font-bold text-slate-900 dark:text-slate-100">{beneficiary.name}</h3>
                    <p className="mt-1 break-words text-sm text-slate-500">{beneficiary.beneficiaryId} / {beneficiary.category}</p>
                  </div>
                </div>
                <StatusBadge status={beneficiary.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <span className="break-words">{beneficiary.location || "Location not added"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CalendarDays className="h-4 w-4 text-emerald-700" />
                  <span>{new Date(beneficiary.requestDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span className="break-words">{beneficiary.approvalAssignedTo || "Approval not assigned"}</span>
                </div>
              </div>
            </div>

            <DetailSection
              title="Identity & Contact"
              fields={[
                { label: "Beneficiary ID", value: beneficiary.beneficiaryId },
                { label: "Mobile Number", value: beneficiary.mobileNumber },
                { label: "Category", value: beneficiary.category },
                { label: "Income Status", value: beneficiary.incomeStatus },
              ]}
            />
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Bank Details</h4>
              <div className="rounded border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-start gap-2">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">Primary Bank</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{beneficiary.bankName || "-"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{beneficiary.bankAccountNumber || "-"}</p>
                  </div>
                </div>
              </div>
              <DetailSection
                title="Bank Reference"
                fields={[
                  { label: "IFSC Code", value: beneficiary.ifscCode },
                  { label: "Branch Name", value: beneficiary.branchName },
                ]}
              />
            </section>
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Case & Approval</h4>
              <div className="grid gap-3">
                <div className="rounded border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium text-slate-500">Family Details</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{beneficiary.familyDetails || "-"}</p>
                </div>
                <div className="rounded border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs font-medium text-slate-500">Address</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{beneficiary.address || "-"}</p>
                </div>
                <div className="rounded border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Case Documents</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {beneficiary.caseDocuments.length ? beneficiary.caseDocuments.join(", ") : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DetailSection
                title="Approval"
                fields={[
                  { label: "Approval Directed To", value: beneficiary.approvalAssignedTo },
                  { label: "Request Date", value: new Date(beneficiary.requestDate).toLocaleDateString() },
                ]}
              />
            </section>
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment Dues" />
          <DataTable data={displayedDues} columns={columns} globalFilter="" />
        </Card>
      </div>

      <Card>
        <button
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          type="button"
          onClick={() => setShowPaymentHistory((current) => !current)}
          aria-expanded={showPaymentHistory}
        >
          <div>
            <h3 className="font-semibold">Payment History</h3>
            <p className="mt-1 text-sm text-slate-500">{paymentLogs.length} paid voucher record{paymentLogs.length === 1 ? "" : "s"}</p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${showPaymentHistory ? "rotate-180" : ""}`} />
        </button>
        {showPaymentHistory && <DataTable data={paymentLogs} columns={paymentLogColumns} globalFilter="" />}
      </Card>

      {isCreatingDue && (
        <Modal title="Create payment due" onClose={() => setIsCreatingDue(false)}>
          <BeneficiaryDueForm
            defaultCategory={normalizePaymentCategory(beneficiary.category, categoryOptions) || categoryOptions[0] || ""}
            categoryOptions={categoryOptions}
            onSubmit={handleCreateDue}
            onCancel={() => setIsCreatingDue(false)}
          />
        </Modal>
      )}
    </div>
  );
}
