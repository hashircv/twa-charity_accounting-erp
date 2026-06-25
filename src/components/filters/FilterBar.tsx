import { SlidersHorizontal } from "lucide-react";
import { SearchInput } from "@/components/filters/SearchInput";

export function FilterBar({ search, onSearch, children }: { search: string; onSearch: (value: string) => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput value={search} onChange={onSearch} placeholder="Search records" />
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <SlidersHorizontal className="hidden h-4 w-4 text-slate-400 sm:block" />
        {children}
      </div>
    </div>
  );
}
