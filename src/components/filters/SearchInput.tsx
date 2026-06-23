import { Search } from "lucide-react";

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex h-9 w-full min-w-0 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 sm:min-w-64 sm:flex-1">
      <Search className="h-4 w-4" />
      <input
        className="w-full bg-transparent outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
