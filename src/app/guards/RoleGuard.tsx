import { Navigate, useLocation } from "react-router";
import { useAppSelector } from "@/hooks/redux";
import { selectCurrentUser } from "@/store/selectors";
import type { UserRole } from "@/types/domain";

export function RoleGuard({ requiredRoles, children }: { requiredRoles: UserRole[]; children: React.ReactNode }) {
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();

  if (!requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return children;
}
