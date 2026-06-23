import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { DataTable } from "@/components/tables/DataTable";
import { Card, CardHeader } from "@/components/ui/Card";

export function ModulePage<T>({
  title,
  description,
  data,
  columns,
  children,
  filterSlot,
}: {
  title: string;
  description: string;
  data: T[];
  columns: ColumnDef<T>[];
  children?: React.ReactNode;
  filterSlot?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const memoColumns = useMemo(() => columns, [columns]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
      <FilterBar search={search} onSearch={setSearch}>
        {filterSlot ?? <span className="text-xs font-medium text-slate-500">Filters are repository-backed</span>}
      </FilterBar>
      <Card>
        <CardHeader title={`${title} Register`} />
        <DataTable data={data} columns={memoColumns} globalFilter={search} />
      </Card>
    </div>
  );
}
