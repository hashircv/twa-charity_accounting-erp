import { X } from "lucide-react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 sm:place-items-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-3xl sm:rounded">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="min-w-0 truncate text-sm font-semibold">{title}</h2>
          <button
            className="grid h-8 w-8 place-items-center rounded border border-slate-200 text-slate-500 dark:border-slate-800"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-4">{children}</div>
      </section>
    </div>
  );
}
