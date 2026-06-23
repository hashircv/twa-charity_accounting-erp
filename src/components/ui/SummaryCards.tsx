import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";

export interface SummaryCardItem {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
}

export function SummaryCards({ items }: { items: SummaryCardItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className="mt-2 break-words text-lg font-bold sm:text-xl">{item.value}</p>
                {item.detail && <p className="mt-1 text-xs text-slate-500">{item.detail}</p>}
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-slate-100 text-emerald-800 dark:bg-slate-900 dark:text-emerald-200">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
