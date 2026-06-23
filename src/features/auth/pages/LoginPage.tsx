import { LogIn } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation } from "react-router";
import { SelectControl } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { authActions } from "@/features/auth/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectIsAuthenticated } from "@/store/selectors";
import type { UserRole } from "@/types/domain";

const roles: UserRole[] = ["Administrator", "President", "Treasurer", "Executive Member"];

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { notify } = useToast();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [role, setRole] = useState<UserRole>("Administrator");
  const [email, setEmail] = useState("admin@twakuwait.org");
  const [password, setPassword] = useState("demo123");
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7fb] p-6">
      <form
        className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch(authActions.loggedIn({ role }));
          notify({ tone: "success", title: "Signed in", description: `${role} session started.` });
        }}
      >
        <div className="grid h-12 w-12 place-items-center rounded bg-emerald-700 text-sm font-bold text-white">TWA</div>
        <h1 className="mt-4 text-xl font-bold">TWA Kuwait Charity Accounting</h1>
        <p className="mt-2 text-sm text-slate-500">Use the mock credentials below to test route protection and role-based menus.</p>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 h-11 w-full rounded border border-slate-200 px-3 text-base outline-none focus:border-emerald-600 sm:h-10 sm:text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1 h-10 w-full rounded border border-slate-200 px-3 outline-none focus:border-emerald-600"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          <label className="block text-sm font-medium">
            Role
            <SelectControl
              className="mt-1"
              options={roles.map((item) => ({ value: item, label: item }))}
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            />
          </label>
        </div>
        <Button className="mt-5 w-full" disabled={!email || !password}>
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
      </form>
    </main>
  );
}
