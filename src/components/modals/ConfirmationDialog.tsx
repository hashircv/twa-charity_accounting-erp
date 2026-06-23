import { Button } from "@/components/ui/Button";

export function ConfirmationDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-0 sm:place-items-center sm:p-4">
      <div className="w-full rounded-t border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md sm:rounded">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button className="bg-slate-600 hover:bg-slate-700" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button className="bg-red-700 hover:bg-red-800" onClick={onConfirm} type="button">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
