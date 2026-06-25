import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLLabelElement>(null);
  const selectedLabel = value || "All";
  const allOptions = ["", ...options];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  return (
    <label ref={wrapperRef} className="relative flex w-full flex-col gap-1 text-xs font-medium text-slate-500 sm:w-auto sm:min-w-40 lg:min-w-44">
      <span>{label}</span>
      <button
        className="flex h-11 w-full items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 text-left text-base text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:h-9 sm:text-sm"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-30 mt-1 max-h-64 w-max min-w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
          role="listbox"
        >
          {allOptions.map((option) => {
            const optionLabel = option || "All";
            const isSelected = option === value;
            return (
              <button
                className={`block w-full px-3 py-2 text-left text-base sm:text-sm ${
                  isSelected
                    ? "bg-emerald-700 text-white"
                    : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
                }`}
                key={optionLabel}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                <span className="block whitespace-normal break-normal">{optionLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}
