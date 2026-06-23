import { format } from "date-fns";
import type { AuditLog } from "@/types/domain";

export function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="border-l-2 border-emerald-600 pl-3">
          <p className="text-sm font-semibold">{log.action} in {log.module}</p>
          <p className="text-xs text-slate-500">{log.user} | {format(new Date(log.timestamp), "dd MMM yyyy, h:mm a")}</p>
        </li>
      ))}
    </ol>
  );
}
