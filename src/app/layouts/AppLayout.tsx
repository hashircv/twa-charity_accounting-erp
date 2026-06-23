import { Link, NavLink, Outlet, matchPath, useLocation } from "react-router";
import {
  ArrowLeftRight,
  Banknote,
  Bell,
  BookOpenCheck,
  Building2,
  ClipboardList,
  Coins,
  FileBarChart,
  Gauge,
  HandCoins,
  HeartHandshake,
  Landmark,
  Menu,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { appRoutes } from "@/app/router/routes";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useToast } from "@/components/ui/Toaster";
import { authActions } from "@/features/auth/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectCurrentUser } from "@/store/selectors";

const icons: Record<string, React.ElementType> = {
  Dashboard: Gauge,
  Members: Users,
  Users: UserCog,
  Receipt: HandCoins,
  Banks: Landmark,
  Interchange: ArrowLeftRight,
  Beneficiaries: HeartHandshake,
  Assistance: ClipboardList,
  Commitments: BookOpenCheck,
  Contributions: Coins,
  Payments: Banknote,
  Accounting: Building2,
  AccountHeads: Building2,
  Accounts: Building2,
  // Reports: FileBarChart,
  Audit: ShieldCheck,
  Settings: Settings,
};

const masterModules = new Set(["Members", "Users", "Beneficiaries"]);
const accountModules = new Set(["Banks", "Accounting", "AccountHeads", "Accounts"]);
const reportModules = new Set(["Commitments", "Assistance", "Contributions"]);

const getRouteSection = (module: string) => {
  if (module === "Dashboard") return "Main";
  if (masterModules.has(module)) return "Master";
  if (accountModules.has(module)) return "Accounts";
  if (reportModules.has(module)) return "Reports";
  if (module === "Audit" || module === "Settings") return "Administration";
  return "Transactions";
};

const getCurrentRoute = (pathname: string) =>
  appRoutes.find((route) => matchPath({ path: route.path, end: true }, pathname));

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const user = useAppSelector(selectCurrentUser);
  const visibleRoutes = useMemo(
    () => appRoutes.filter((route) => route.requiredRoles.includes(user.role) && !route.hideInNav),
    [user.role],
  );
  const groupedRoutes = useMemo(
    () =>
      ["Main", "Master", "Accounts", "Transactions", "Reports", "Administration"]
        .map((section) => ({
          section,
          routes: visibleRoutes.filter((route) => getRouteSection(route.module) === section),
        }))
        .filter((group) => group.routes.length > 0),
    [visibleRoutes],
  );
  const current = getCurrentRoute(location.pathname);
  const parentRoute = current?.breadcrumbParent ? appRoutes.find((route) => route.path === current.breadcrumbParent) : undefined;
  const breadcrumbs = [
    { label: "Home", path: "/" },
    ...(parentRoute ? [{ label: parentRoute.label, path: parentRoute.path }] : current?.path !== "/" ? [] : []),
    ...(current && current.path !== "/" ? [{ label: current.label, path: current.path }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 dark:bg-[#151922] dark:text-slate-100">
      {mobileNavOpen && (
        <button
          className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-950 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          collapsed ? "w-20" : "w-72 max-w-[85vw]"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="grid h-10 w-10 place-items-center rounded bg-emerald-700 text-sm font-bold text-white">TWA</div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold">TWA Kuwait Charity</p>
              <p className="text-xs text-slate-500">Accounting ERP</p>
            </div>
          )}
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-3">
          {groupedRoutes.map((group) => (
            <div key={group.section} className="mb-5 last:mb-0">
              {!collapsed && (
                <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.section}
                </p>
              )}
              <div className="space-y-1">
                {group.routes.map((route) => {
                  const Icon = icons[route.module] ?? Gauge;
                  return (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        `flex h-10 items-center gap-3 rounded px-3 text-sm font-medium transition ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {!collapsed && route.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className={collapsed ? "lg:pl-20" : "lg:pl-72"}>
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 1024px)").matches) {
                  setCollapsed((value) => !value);
                } else {
                  setMobileNavOpen((value) => !value);
                }
              }}
              className="grid h-9 w-9 place-items-center rounded border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <nav className="flex min-w-0 items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <span className="flex min-w-0 items-center gap-1" key={`${crumb.path}-${crumb.label}`}>
                      {index > 0 && <span className="text-slate-300">/</span>}
                      {isLast ? (
                        <span className="truncate font-medium text-slate-600 dark:text-slate-300">{crumb.label}</span>
                      ) : (
                        <Link className="truncate hover:text-emerald-700" to={crumb.path}>
                          {crumb.label}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </nav>
              <h1 className="truncate text-base font-semibold sm:text-lg">{current?.label ?? "Dashboard"}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <label className="hidden h-9 w-80 items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 md:flex dark:border-slate-800 dark:bg-slate-900">
              <Search className="h-4 w-4" />
              <input className="w-full bg-transparent outline-none" placeholder="Search receipts, members, beneficiaries" />
            </label>
            <button className="grid h-9 w-9 place-items-center rounded border border-slate-200 dark:border-slate-700" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <RoleBadge role={user.role} />
            </div>
            <button
              className="grid h-9 w-9 place-items-center rounded border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              onClick={() => {
                dispatch(authActions.loggedOut());
                notify({ tone: "info", title: "Signed out", description: "Your mock session has ended." });
              }}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
