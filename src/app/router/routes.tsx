import { lazy } from "react";
import type { UserRole } from "@/types/domain";

export interface AppRoute {
  path: string;
  label: string;
  module: string;
  requiredRoles: UserRole[];
  element: React.LazyExoticComponent<() => React.ReactElement>;
  hideInNav?: boolean;
  breadcrumbParent?: string;
}

const allRoles: UserRole[] = ["Administrator", "President", "Secretary", "Treasurer", "Executive Member", "General Member"];
const financeRoles: UserRole[] = ["Administrator", "President", "Treasurer"];
const managementRoles: UserRole[] = ["Administrator", "President", "Secretary", "Executive Member"];

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    label: "Dashboard",
    module: "Dashboard",
    requiredRoles: allRoles,
    element: lazy(() => import("@/features/dashboard/pages/DashboardPage")),
  },
  {
    path: "/members",
    label: "Members",
    module: "Members",
    requiredRoles: ["Administrator", "President", "Secretary"],
    element: lazy(() => import("@/features/members/pages/MembersPage")),
  },
  {
    path: "/members/:memberId",
    label: "Member Details",
    module: "Members",
    requiredRoles: ["Administrator", "President", "Secretary"],
    element: lazy(() => import("@/features/members/pages/MemberDetailPage")),
    hideInNav: true,
    breadcrumbParent: "/members",
  },
  {
    path: "/users",
    label: "Users",
    module: "Users",
    requiredRoles: ["Administrator"],
    element: lazy(() => import("@/features/users/pages/UsersPage")),
  },
  {
    path: "/beneficiaries",
    label: "Beneficiaries",
    module: "Beneficiaries",
    requiredRoles: managementRoles,
    element: lazy(() => import("@/features/beneficiaries/pages/BeneficiariesPage")),
  },
  {
    path: "/beneficiaries/:beneficiaryId",
    label: "Beneficiary Details",
    module: "Beneficiaries",
    requiredRoles: managementRoles,
    element: lazy(() => import("@/features/beneficiaries/pages/BeneficiaryDetailPage")),
    hideInNav: true,
    breadcrumbParent: "/beneficiaries",
  },
  {
    path: "/cashAccount",
    label: "Cash Accounts",
    module: "Banks",
    requiredRoles: financeRoles,
    element: lazy(() => import("@/features/banks/pages/BanksPage")),
  },
  {
    path: "/interchange",
    label: "Interchange",
    module: "Interchange",
    requiredRoles: financeRoles,
    element: lazy(() => import("@/features/interchange/pages/InterchangePage")),
  },
  {
    path: "/receipt",
    label: "Receipt",
    module: "Receipt",
    requiredRoles: ["Administrator", "Treasurer", "Executive Member"],
    element: lazy(() => import("@/features/collections/pages/CollectionsPage")),
  },
  {
    path: "/payments",
    label: "Payments",
    module: "Payments",
    requiredRoles: financeRoles,
    element: lazy(() => import("@/features/payments/pages/PaymentsPage")),
  },
  {
    path: "/assistance",
    label: "Assistance",
    module: "Assistance",
    requiredRoles: managementRoles,
    element: lazy(() => import("@/features/assistance/pages/AssistancePage")),
  },
  {
    path: "/commitments",
    label: "Commitments",
    module: "Commitments",
    requiredRoles: financeRoles,
    element: lazy(() => import("@/features/commitments/pages/CommitmentsPage")),
  },
  {
    path: "/contributions",
    label: "Contributions",
    module: "Contributions",
    requiredRoles: allRoles,
    element: lazy(() => import("@/features/contributions/pages/ContributionsPage")),
  },
  
  {
    path: "/accountHeads",
    label: "Account Heads",
    module: "AccountHeads",
    requiredRoles: financeRoles,
    element: lazy(() => import("@/features/accounting/pages/AccountingPage")),
  },
  {
    path: "/accountHeads/:accountId",
    label: "Account Details",
    module: "AccountHeads",
    requiredRoles: financeRoles,
    element: lazy(() => import("@/features/accounting/pages/AccountingDetailPage")),
    hideInNav: true,
    breadcrumbParent: "/accountHeads",
  },
  // {
  //   path: "/reports",
  //   label: "Reports",
  //   module: "Reports",
  //   requiredRoles: financeRoles,
  //   element: lazy(() => import("@/features/reports/pages/ReportsPage")),
  // },
  {
    path: "/audit",
    label: "Audit",
    module: "Audit",
    requiredRoles: ["Administrator", "President"],
    element: lazy(() => import("@/features/audit/pages/AuditPage")),
  },
  {
    path: "/settings",
    label: "Settings",
    module: "Settings",
    requiredRoles: ["Administrator"],
    element: lazy(() => import("@/features/settings/pages/SettingsPage")),
  },
];
