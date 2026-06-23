import type { UserRole } from "@/types/domain";

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
      {role}
    </span>
  );
}
