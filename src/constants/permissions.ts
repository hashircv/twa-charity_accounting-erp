import type { Permission, UserRole } from "@/types/domain";

export const rolePermissions: Record<UserRole, Permission[]> = {
  Administrator: [
    "dashboard:view",
    "members:manage",
    "collections:manage",
    "custody:manage",
    "beneficiaries:manage",
    "payments:approve",
    "reports:export",
    "settings:manage",
    "audit:view",
  ],
  President: [
    "dashboard:view",
    "members:manage",
    "beneficiaries:manage",
    "payments:approve",
    "reports:export",
    "audit:view",
  ],
  Secretary: ["dashboard:view", "members:manage", "beneficiaries:manage"],
  Treasurer: [
    "dashboard:view",
    "collections:manage",
    "custody:manage",
    "payments:approve",
    "reports:export",
  ],
  "Executive Member": ["dashboard:view", "collections:manage", "beneficiaries:manage"],
  "General Member": ["dashboard:view"],
};

export const hasPermission = (permissions: Permission[], permission: Permission) =>
  permissions.includes(permission);
