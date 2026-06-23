import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Clock, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { SelectFilter } from "@/components/filters/SelectFilter";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { ModulePage } from "@/components/shared/ModulePage";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useAppSelector } from "@/hooks/redux";
import { auditSelectors } from "@/store/selectors";
import type { AuditLog } from "@/types/domain";

function DiffCell({ previous, next }: { previous: unknown; next: unknown }) {
  const prevStr = JSON.stringify(previous, null, 0);
  const nextStr = JSON.stringify(next, null, 0);
  if (prevStr === nextStr) return <span className="text-xs text-slate-400">No change</span>;
  return (
    <div className="flex flex-col gap-0.5 text-[11px] leading-tight font-mono">
      <span className="text-red-500 line-through">{prevStr}</span>
      <span className="text-emerald-600">{nextStr}</span>
    </div>
  );
}

export default function AuditPage() {
  const logs = useAppSelector(auditSelectors.selectAll);
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          (!module || log.module === module) &&
          (!action || log.action === action) &&
          (!user || log.user === user),
      ),
    [action, logs, module, user],
  );

  const sortedLogs = useMemo(
    () => [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [filteredLogs],
  );

  // KPI computation
  const uniqueUsers = useMemo(() => new Set(logs.map((l) => l.user)).size, [logs]);
  const uniqueModules = useMemo(() => new Set(logs.map((l) => l.module)).size, [logs]);
  const today = new Date().toDateString();
  const todayCount = useMemo(() => logs.filter((l) => new Date(l.timestamp).toDateString() === today).length, [logs, today]);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap">{new Date(row.original.timestamp).toLocaleString()}</span>
      ),
    },
    { accessorKey: "user", header: "User" },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => <StatusBadge status={row.original.action} />,
    },
    { accessorKey: "module", header: "Module" },
    {
      id: "changes",
      header: "Changes",
      cell: ({ row }) => <DiffCell previous={row.original.previousValue} next={row.original.newValue} />,
    },
  ];

  return (
    <div className="space-y-4">
      <SummaryCards
        items={[
          { label: "Total Events", value: String(logs.length), detail: "Across all modules", icon: Activity },
          { label: "Today's Activity", value: String(todayCount), detail: "Events logged today", icon: Clock },
          { label: "Unique Users", value: String(uniqueUsers), detail: "Contributors to audit trail", icon: Users },
          { label: "Modules Tracked", value: String(uniqueModules), detail: "Active module coverage", icon: ShieldCheck },
        ]}
      />

      <ModulePage
        title="Audit Trail"
        description="Soft deletion, login history, transaction changes, and module-level activity."
        data={sortedLogs}
        columns={columns}
        filterSlot={
          <>
            <SelectFilter label="Module" value={module} onChange={setModule} options={[...new Set(logs.map((item) => item.module))]} />
            <SelectFilter label="Action" value={action} onChange={setAction} options={[...new Set(logs.map((item) => item.action))]} />
            <SelectFilter label="User" value={user} onChange={setUser} options={[...new Set(logs.map((item) => item.user))]} />
          </>
        }
      >
        <Card>
          <CardHeader title="Recent Timeline" />
          <div className="p-4">
            <AuditTimeline logs={sortedLogs.slice(0, 8)} />
          </div>
        </Card>
      </ModulePage>
    </div>
  );
}
