import { Navigate, useLocation } from "react-router";
import { RoleGuard } from "@/app/guards/RoleGuard";
import { useAppSelector } from "@/hooks/redux";
import { selectIsAuthenticated } from "@/store/selectors";
import type { UserRole } from "@/types/domain";

export function ProtectedRoute({ requiredRoles, children }: { requiredRoles: UserRole[]; children: React.ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <RoleGuard requiredRoles={requiredRoles}>{children}</RoleGuard>;
}
