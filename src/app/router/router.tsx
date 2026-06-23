import { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { AppLayout } from "@/app/layouts/AppLayout";
import { Bootstrap } from "@/app/providers/Bootstrap";
import { appRoutes } from "@/app/router/routes";
import LoginPage from "@/features/auth/pages/LoginPage";

const Loading = () => <div className="p-6 text-sm text-slate-500">Loading module...</div>;

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: (
      <Bootstrap>
        <AppLayout />
      </Bootstrap>
    ),
    children: [
      ...appRoutes.map(({ element: Element, requiredRoles, path }) => ({
        path,
        element: (
          <ProtectedRoute requiredRoles={requiredRoles}>
            <Suspense fallback={<Loading />}>
              <Element />
            </Suspense>
          </ProtectedRoute>
        ),
      })),
      {
        path: "/unauthorized",
        element: <div className="p-8 text-sm font-semibold text-red-700">You do not have access to this module.</div>,
      },
    ],
  },
]);
