import {
  Building2,
  Check,
  ChevronRight,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  SunMoon,
  UserCog,
  X,
} from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { useToast } from "@/components/ui/Toaster";
import { authActions } from "@/features/auth/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { rolePermissions } from "@/constants/permissions";
import { selectCurrentUser } from "@/store/selectors";
import type { Permission, UserRole } from "@/types/domain";

const ALL_ROLES: UserRole[] = [
  "Administrator",
  "President",
  "Secretary",
  "Treasurer",
  "Executive Member",
  "General Member",
];

const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "members:manage",
  "collections:manage",
  "custody:manage",
  "beneficiaries:manage",
  "payments:approve",
  "reports:export",
  "settings:manage",
  "audit:view",
];

const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:view": "Dashboard",
  "members:manage": "Members",
  "collections:manage": "Collections",
  "custody:manage": "Cash / Banks",
  "beneficiaries:manage": "Beneficiaries",
  "payments:approve": "Payments",
  "reports:export": "Reports",
  "settings:manage": "Settings",
  "audit:view": "Audit Log",
};

const ORG_INFO = {
  name: "Thalassery Welfare Association Kuwait",
  shortName: "TWA Kuwait",
  registrationNo: "TWA/KW/2008/001",
  president: "TWA President",
  treasurer: "TWA Treasurer",
  kuwaitAddress: "Block 12, Al-Fahaheel, Kuwait",
  indiaAddress: "Kerala Chapter, Thrissur, Kerala, India",
  email: "admin@twakuwait.org",
  phone: "+965 2345 6789",
  fiscalYear: "April – March",
  baseCurrency: "KWD",
  reportingCurrency: "INR",
};

function useTheme() {
  const getTheme = () => {
    if (document.documentElement.classList.contains("dark")) return "dark";
    return "light";
  };
  const [theme, setThemeState] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("twa-theme") as "light" | "dark" | "system") ?? "system",
  );

  const applyTheme = (t: "light" | "dark" | "system") => {
    const resolved = t === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    localStorage.setItem("twa-theme", t);
    setThemeState(t);
  };

  return { theme, applyTheme, getTheme };
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const user = useAppSelector(selectCurrentUser);
  const { theme, applyTheme } = useTheme();

  const handleRoleSwitch = (role: UserRole) => {
    dispatch(authActions.loggedIn({ role }));
    notify({ tone: "success", title: "Role switched", description: `Now viewing as ${role}.` });
  };

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <SummaryCards
        items={[
          {
            label: "Active Role",
            value: user.role,
            detail: `${user.permissions.length} permissions granted`,
            icon: UserCog,
          },
          {
            label: "Roles Configured",
            value: String(ALL_ROLES.length),
            detail: "Full permission matrix",
            icon: ShieldCheck,
          },
          {
            label: "Appearance",
            value: theme.charAt(0).toUpperCase() + theme.slice(1),
            detail: "Light · Dark · System",
            icon: Palette,
          },
          {
            label: "Organisation",
            value: ORG_INFO.shortName,
            detail: ORG_INFO.registrationNo,
            icon: Building2,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Role Switcher ─────────────────────────────── */}
        <Card>
          <CardHeader title="Mock Role Switcher" />
          <div className="p-4">
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Switch the active session role to test different permission levels across the application.
            </p>
            <div className="space-y-2">
              {ALL_ROLES.map((role) => {
                const isActive = user.role === role;
                const permCount = rolePermissions[role].length;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSwitch(role)}
                    className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {role.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{role}</p>
                        <p className="text-xs text-slate-500">{permCount} permission{permCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ── Appearance ────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Appearance" />
            <div className="p-4">
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                Choose how the application looks. System follows your OS preference.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["light", "dark", "system"] as const).map((t) => {
                  const Icon = t === "light" ? Sun : t === "dark" ? Moon : SunMoon;
                  const label = t.charAt(0).toUpperCase() + t.slice(1);
                  const isActive = theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyTheme(t)}
                      className={`flex flex-col items-center gap-2 rounded border px-3 py-4 transition ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                      {isActive && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* ── Organisation Info ─────────────────────── */}
          <Card>
            <CardHeader title="Organisation" />
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { label: "Full Name", value: ORG_INFO.name },
                { label: "Registration No.", value: ORG_INFO.registrationNo },
                { label: "President", value: ORG_INFO.president },
                { label: "Treasurer", value: ORG_INFO.treasurer },
                { label: "Kuwait Address", value: ORG_INFO.kuwaitAddress },
                { label: "India Address", value: ORG_INFO.indiaAddress },
                { label: "Fiscal Year", value: ORG_INFO.fiscalYear },
                { label: "Base Currency", value: ORG_INFO.baseCurrency },
                { label: "Reporting Currency", value: ORG_INFO.reportingCurrency },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:min-w-36">{label}</span>
                  <span className="break-words text-xs text-slate-800 dark:text-slate-200 sm:text-right">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Permission Matrix ─────────────────────────────── */}
      <Card>
        <CardHeader title="Permission Matrix" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">
                  Permission
                </th>
                {ALL_ROLES.map((role) => (
                  <th
                    key={role}
                    className={`whitespace-nowrap px-3 py-3 text-center font-semibold ${
                      user.role === role
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {role}
                    {user.role === role && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ALL_PERMISSIONS.map((permission) => (
                <tr
                  key={permission}
                  className={`transition ${
                    user.permissions.includes(permission)
                      ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                      : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                    {PERMISSION_LABELS[permission]}
                    <span className="ml-2 font-mono text-slate-400">{permission}</span>
                  </td>
                  {ALL_ROLES.map((role) => {
                    const hasIt = rolePermissions[role].includes(permission);
                    const isCurrentRole = user.role === role;
                    return (
                      <td key={role} className="px-3 py-2.5 text-center">
                        {hasIt ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                              isCurrentRole
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
