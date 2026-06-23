import { useAppSelector } from "@/hooks/redux";
import { selectCurrentUser } from "@/store/selectors";
import type { Permission } from "@/types/domain";

export function PermissionGuard({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const user = useAppSelector(selectCurrentUser);

  if (!user.permissions.includes(permission)) {
    return null;
  }

  return children;
}
