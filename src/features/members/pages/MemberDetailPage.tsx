import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, ChevronDown, CopyPlus, CreditCard, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod";
import { NumberField, SelectField, TextField } from "@/components/forms/FormField";
import { Modal } from "@/components/modals/Modal";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useToast } from "@/components/ui/Toaster";
import {
  accountingStorageKey,
  getIncomeAccountCategoryOptions,
  normalizeIncomeAccountCategory,
  readAccountingAccounts,
} from "@/features/accounting/accountingAccounts";
import {
  createMemberSubscriptionPlan,
  getMemberDues,
  getMemberPaidLogs,
  memberDueStorageKey,
  type MemberPaidLog,
  type MemberSubscriptionDue,
} from "@/features/members/memberDueStore";
import { useAppSelector } from "@/hooks/redux";
import { memberSelectors } from "@/store/selectors";
import { formatCurrency } from "@/utils/currency";

const subscriptionSchema = z
  .object({
    category: z.string().min(1, "Select category"),
    subscriptionType: z.enum(["Monthly", "Quarterly", "Yearly", "One-time"], { required_error: "Select subscription type" }),
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

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;
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

function SubscriptionForm({
  categoryOptions,
  onSubmit,
  onCancel,
}: {
  categoryOptions: string[];
  onSubmit: (values: SubscriptionFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      category: categoryOptions[0] ?? "",
      subscriptionType: "Monthly",
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
          id="subscriptionType"
          label="Type"
          placeholder="Select type"
          error={errors.subscriptionType?.message}
          options={[
            { value: "Monthly", label: "Monthly" },
            { value: "Quarterly", label: "Quarterly" },
            { value: "Yearly", label: "Yearly" },
            { value: "One-time", label: "One-time" },
          ]}
          {...register("subscriptionType")}
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

export default function MemberDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const members = useAppSelector(memberSelectors.selectAll);
  const member = members.find((item) => item.id === memberId);
  const [isCreatingDue, setIsCreatingDue] = useState(false);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [accountHeads, setAccountHeads] = useState(() => readAccountingAccounts());
  const [dues, setDues] = useState<MemberSubscriptionDue[]>(() => (memberId ? getMemberDues(memberId) : []));
  const [paidLogs, setPaidLogs] = useState<MemberPaidLog[]>(() => (memberId ? getMemberPaidLogs(memberId) : []));

  useEffect(() => {
    if (!memberId) return;
    const refreshMemberDues = () => {
      setDues(getMemberDues(memberId));
      setPaidLogs(getMemberPaidLogs(memberId));
    };

    refreshMemberDues();
    const syncMemberDues = (event: StorageEvent) => {
      if (event.key === memberDueStorageKey) {
        refreshMemberDues();
      }
    };

    window.addEventListener("storage", syncMemberDues);
    return () => window.removeEventListener("storage", syncMemberDues);
  }, [memberId]);

  useEffect(() => {
    const syncAccounts = (event: StorageEvent) => {
      if (event.key === accountingStorageKey) setAccountHeads(readAccountingAccounts());
    };
    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, []);

  const totals = useMemo(
    () => ({
      billed: dues.reduce((total, due) => total + due.amount, 0),
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
  const categoryOptions = useMemo(() => getIncomeAccountCategoryOptions(accountHeads), [accountHeads]);

  const handleCreateDue = (values: SubscriptionFormValues) => {
    if (!memberId) return;
    const generatedDues = createMemberSubscriptionPlan(memberId, values);
    setDues(getMemberDues(memberId));
    notify({
      tone: "success",
      title: "Payment due created",
      description: `${generatedDues.length} due record${generatedDues.length === 1 ? "" : "s"} generated.`,
    });
    setIsCreatingDue(false);
  };

  const openReceiptForDue = (due: MemberSubscriptionDue) => {
    navigate("/receipt", {
      state: {
        memberDueReceipt: {
          dueId: due.id,
          memberEntityId: member?.id ?? "",
          memberName: member?.name ?? "Member",
          memberId: member?.memberId ?? "",
          memberContact: member?.contactNumber ?? "",
          category: normalizeIncomeAccountCategory(due.category, categoryOptions) || due.category,
          subscriptionType: due.subscriptionType,
          fromDate: due.fromDate,
          toDate: due.toDate,
          amount: due.dueAmount,
        },
      },
    });
  };

  const columns: ColumnDef<MemberSubscriptionDue>[] = [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "subscriptionType", header: "Type" },
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
          onClick={() => openReceiptForDue(row.original)}
          disabled={row.original.dueAmount <= 0}
          type="button"
        >
          <CreditCard className="h-4 w-4" />
          {row.original.dueAmount <= 0 ? "Paid" : "Pay"}
        </button>
      ),
    },
  ];

  const paidLogColumns: ColumnDef<MemberPaidLog>[] = [
    { accessorKey: "receiptNumber", header: "Receipt" },
    { accessorKey: "date", header: "Date", cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "subscriptionType", header: "Type" },
    { accessorKey: "fromDate", header: "From Date", cell: ({ row }) => new Date(row.original.fromDate).toLocaleDateString() },
    { accessorKey: "toDate", header: "To Date", cell: ({ row }) => new Date(row.original.toDate).toLocaleDateString() },
    { accessorKey: "amount", header: "Paid", cell: ({ row }) => formatCurrency(row.original.amount, "INR") },
  ];

  if (!member) {
    return (
      <div className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" to="/members">
          <ArrowLeft className="h-4 w-4" />
          Back to members
        </Link>
        <Card className="p-4 text-sm text-slate-500">Member not found.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700" to="/members">
            <ArrowLeft className="h-4 w-4" />
            Back to members
          </Link>
          <h2 className="text-xl font-bold">{member.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{member.memberId} / {member.contactNumber}</p>
        </div>
        <Button type="button" onClick={() => setIsCreatingDue(true)}>
          <CopyPlus className="h-4 w-4" />
          Create subscription due
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        {[
          { label: "Total Billed", value: formatCurrency(totals.billed, "INR"), detail: "Subscription dues created" },
          { label: "Total Paid", value: formatCurrency(totals.paid, "INR"), detail: "Payments received" },
          { label: "Payment Due", value: formatCurrency(totals.due, "INR"), detail: "Outstanding balance" },
          { label: "Due Records", value: String(dues.length), detail: "Subscription entries" },
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
            { label: "Total Billed", value: formatCurrency(totals.billed, "INR"), detail: "Subscription dues created", icon: CopyPlus },
            { label: "Total Paid", value: formatCurrency(totals.paid, "INR"), detail: "Payments received", icon: CopyPlus },
            { label: "Payment Due", value: formatCurrency(totals.due, "INR"), detail: "Outstanding balance", icon: CopyPlus },
            { label: "Due Records", value: String(dues.length), detail: "Subscription entries", icon: CopyPlus },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader title="Member Profile" />
          <div className="space-y-5 p-4">
            <div className="rounded border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    {member.profilePhoto ? (
                      <img src={member.profilePhoto} alt={`${member.name} profile`} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Member Record</p>
                    <h3 className="mt-1 break-words text-lg font-bold text-slate-900 dark:text-slate-100">{member.name}</h3>
                    <p className="mt-1 break-words text-sm text-slate-500">{member.memberId}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <RoleBadge role={member.role} />
                  <StatusBadge status={member.status} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-emerald-700" />
                  <span className="break-all">{member.contactNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CalendarDays className="h-4 w-4 text-emerald-700" />
                  <span>{new Date(member.joiningDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>{member.civilId || "Civil ID not added"}</span>
                </div>
              </div>
            </div>

            <DetailSection
              title="Identity"
              fields={[
                { label: "Member ID", value: member.memberId },
                { label: "Age", value: String(member.age) },
                { label: "Civil ID", value: member.civilId ?? "-" },
                { label: "Role", value: member.role },
              ]}
            />
            <DetailSection
              title="Contact"
              fields={[
                { label: "Contact Number", value: member.contactNumber },
                { label: "WhatsApp Number", value: member.whatsappNumber },
              ]}
            />
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Address & Enrollment</h4>
              <div className="rounded border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Kuwait Address</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{member.kuwaitAddress || "-"}</p>
                  </div>
                </div>
              </div>
              <DetailSection title="Enrollment" fields={[{ label: "Joining Date", value: new Date(member.joiningDate).toLocaleDateString() }]} />
            </section>
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscription Dues" />
          <DataTable data={displayedDues} columns={columns} globalFilter="" />
        </Card>
      </div>

      <Card>
        <button
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          type="button"
          onClick={() => setShowReceiptHistory((current) => !current)}
          aria-expanded={showReceiptHistory}
        >
          <div>
            <h3 className="font-semibold">Receipt History</h3>
            <p className="mt-1 text-sm text-slate-500">{paidLogs.length} paid receipt record{paidLogs.length === 1 ? "" : "s"}</p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${showReceiptHistory ? "rotate-180" : ""}`} />
        </button>
        {showReceiptHistory && <DataTable data={paidLogs} columns={paidLogColumns} globalFilter="" />}
      </Card>

      {isCreatingDue && (
        <Modal title="Create subscription due" onClose={() => setIsCreatingDue(false)}>
          <SubscriptionForm categoryOptions={categoryOptions} onSubmit={handleCreateDue} onCancel={() => setIsCreatingDue(false)} />
        </Modal>
      )}

    </div>
  );
}
