export function DrawerForm({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </aside>
  );
}
