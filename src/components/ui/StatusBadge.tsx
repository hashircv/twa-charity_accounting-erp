const colors: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Received: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Created: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200",
  Updated: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
  "Logged in": "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  Pending: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Pledged: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Overdue: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  Cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  Closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${colors[status] ?? colors.Pending}`}>{status}</span>;
}
