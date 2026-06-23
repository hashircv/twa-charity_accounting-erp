import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarRange, FileBarChart, FileSpreadsheet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useAppSelector } from "@/hooks/redux";
import {
  beneficiarySelectors,
  collectionSelectors,
  commitmentSelectors,
  contributionSelectors,
  paymentSelectors,
} from "@/store/selectors";
import { DataTable } from "@/components/tables/DataTable";
import { FilterBar } from "@/components/filters/FilterBar";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { SelectControl } from "@/components/forms/FormField";
import { formatCurrency } from "@/utils/currency";

const reports = [
  "Original Currency Report",
  "INR Consolidated Report",
  "Collection Reports",
  "Member Subscription Report",
  "Ramadan Collection Report",
  "General Collection Report",
  "Executive Reports",
  "Funds Held by Executive",
  "Outstanding Balance",
  "Treasurer Reports",
  "Beneficiary Reports",
  "Assistance by Category",
  "Assistance by Beneficiary",
  "Active Cases",
  "Closed Cases",
  "Commitment Reports",
  "Contribution Reports",
  "Receipt & Payment Statement",
  "Income & Expenditure Statement",
  "Cash Flow Statement",
] as const;

type ReportName = (typeof reports)[number];
type ReportRow = {
  reference: string;
  date: string;
  party: string;
  module: string;
  category: string;
  currency: string;
  originalAmount: number;
  inrAmount: number;
  status: string;
};

const reportColumns: ColumnDef<ReportRow>[] = [
  { accessorKey: "reference", header: "Reference" },
  { accessorKey: "date", header: "Date" },
  { accessorKey: "party", header: "Party" },
  { accessorKey: "module", header: "Module" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "originalAmount", header: "Original", cell: ({ row }) => formatCurrency(row.original.originalAmount, row.original.currency as "KWD" | "INR") },
  { accessorKey: "inrAmount", header: "INR", cell: ({ row }) => formatCurrency(row.original.inrAmount, "INR") },
  { accessorKey: "status", header: "Status" },
];

const isBetweenDates = (date: string, from: string, to: string) => {
  const value = new Date(date).getTime();
  return (!from || value >= new Date(from).getTime()) && (!to || value <= new Date(to).getTime());
};

export default function ReportsPage() {
  const collections = useAppSelector(collectionSelectors.selectAll);
  const payments = useAppSelector(paymentSelectors.selectAll);
  const beneficiaries = useAppSelector(beneficiarySelectors.selectAll);
  const commitments = useAppSelector(commitmentSelectors.selectAll);
  const contributions = useAppSelector(contributionSelectors.selectAll);
  const [selectedReport, setSelectedReport] = useState<ReportName>("Receipt & Payment Statement");
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("");
  const [category, setCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const allRows = useMemo<ReportRow[]>(() => {
    const collectionRows = collections.map((collection) => ({
      reference: collection.receiptNumber,
      date: collection.date,
      party: collection.donorName,
      module: "Collections",
      category: collection.category,
      currency: collection.amount.currency,
      originalAmount: collection.amount.originalAmount,
      inrAmount: collection.amount.convertedAmount,
      status: collection.depositStatus,
    }));
    const paymentRows = payments.map((payment) => ({
      reference: payment.voucherNumber,
      date: payment.date,
      party: beneficiaries.find((beneficiary) => beneficiary.id === payment.beneficiaryId)?.name ?? payment.beneficiaryId,
      module: "Payments",
      category: payment.category,
      currency: payment.amount.currency,
      originalAmount: payment.amount.originalAmount,
      inrAmount: payment.amount.convertedAmount,
      status: payment.status,
    }));
    const commitmentRows = commitments.map((commitment) => ({
      reference: commitment.id,
      date: commitment.approvalDate,
      party: beneficiaries.find((beneficiary) => beneficiary.id === commitment.beneficiaryId)?.name ?? commitment.beneficiaryId,
      module: "Commitments",
      category: commitment.category,
      currency: commitment.totalApproved.currency,
      originalAmount: commitment.totalApproved.originalAmount,
      inrAmount: commitment.remainingBalance,
      status: commitment.status,
    }));
    const contributionRows = contributions.map((contribution) => ({
      reference: contribution.caseReferenceNumber,
      date: contribution.createdAt,
      party: contribution.contributorName,
      module: "Contributions",
      category: contribution.contributionType,
      currency: contribution.amount.currency,
      originalAmount: contribution.amount.originalAmount,
      inrAmount: contribution.amount.convertedAmount,
      status: contribution.collectionStatus,
    }));

    if (selectedReport.includes("Collection") || selectedReport.includes("Ramadan") || selectedReport.includes("Subscription")) return collectionRows;
    if (selectedReport.includes("Commitment")) return commitmentRows;
    if (selectedReport.includes("Contribution")) return contributionRows;
    if (selectedReport.includes("Beneficiary") || selectedReport.includes("Assistance")) return [...paymentRows, ...commitmentRows];
    if (selectedReport.includes("Cash Flow") || selectedReport.includes("Receipt & Payment") || selectedReport.includes("Income & Expenditure")) {
      return [...collectionRows, ...paymentRows];
    }

    return [...collectionRows, ...paymentRows, ...commitmentRows, ...contributionRows];
  }, [beneficiaries, collections, commitments, contributions, payments, selectedReport]);

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          (!currency || row.currency === currency) &&
          (!category || row.category === category) &&
          isBetweenDates(row.date, fromDate, toDate),
      ),
    [allRows, category, currency, fromDate, toDate],
  );
  const totalInr = filteredRows.reduce((sum, row) => sum + row.inrAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SummaryCards
          items={[
            { label: "Reports", value: String(reports.length), detail: "Selectable report catalogue", icon: FileBarChart },
            { label: "Filtered Rows", value: String(filteredRows.length), detail: "Current report output", icon: CalendarRange },
            { label: "Total INR", value: formatCurrency(totalInr, "INR"), detail: "Filtered consolidation", icon: FileSpreadsheet },
          ]}
        />
      </div>
      <Card>
        <CardHeader title="Report Builder" />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-medium text-slate-500 xl:col-span-2">
            Report
            <SelectControl
              className="mt-1"
              options={reports.map((report) => ({ value: report, label: report }))}
              value={selectedReport}
              onChange={(event) => setSelectedReport(event.target.value as ReportName)}
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            From
            <input
              className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            To
            <input
              className="mt-1 h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              className="h-10 rounded border border-slate-200 px-3 text-sm font-semibold dark:border-slate-800"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setCurrency("");
                setCategory("");
              }}
              type="button"
            >
              Reset filters
            </button>
          </div>
        </div>
      </Card>
      <FilterBar search={search} onSearch={setSearch}>
        <SelectFilter label="Currency" value={currency} onChange={setCurrency} options={["KWD", "INR"]} />
        <SelectFilter label="Category" value={category} onChange={setCategory} options={[...new Set(allRows.map((row) => row.category))]} />
      </FilterBar>
      <Card>
        <CardHeader title="Report Preview" />
        <DataTable data={filteredRows} columns={reportColumns} globalFilter={search} />
      </Card>
      <Card>
        <CardHeader title="Report Catalogue" />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {reports.map((report) => (
            <button
              className={`rounded border p-3 text-left transition ${
                selectedReport === report
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              }`}
              key={report}
              onClick={() => setSelectedReport(report)}
              type="button"
            >
              <p className="text-sm font-semibold">{report}</p>
              <p className="mt-1 text-xs text-slate-500">Date, currency, beneficiary, category, and preview support.</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
