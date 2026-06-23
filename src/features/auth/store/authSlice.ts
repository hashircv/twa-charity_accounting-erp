import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { rolePermissions } from "@/constants/permissions";
import { currentUser } from "@/services/mock/mockData";
import type { User, UserRole } from "@/types/domain";

const sessionKey = "twa-charity-session";

const buildUserForRole = (role: UserRole): User => ({
  ...currentUser,
  id: `mock-user-${role.toLowerCase().replaceAll(" ", "-")}`,
  name: role === "Administrator" ? "TWA Administrator" : `TWA ${role}`,
  email: `${role.toLowerCase().replaceAll(" ", ".")}@twakuwait.org`,
  role,
  permissions: rolePermissions[role],
  lastLoginAt: new Date().toISOString(),
});

const readStoredUser = () => {
  try {
    const stored = localStorage.getItem(sessionKey);
    return stored ? (JSON.parse(stored) as User) : undefined;
  } catch {
    return undefined;
  }
};

const storedUser = typeof localStorage === "undefined" ? undefined : readStoredUser();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser ?? buildUserForRole("Administrator"),
    isAuthenticated: Boolean(storedUser),
  },
  reducers: {
    loggedOut(state) {
      state.isAuthenticated = false;
      localStorage.removeItem(sessionKey);
    },
    loggedIn(state, action: PayloadAction<{ role: UserRole }>) {
      const user = buildUserForRole(action.payload.role);
      state.user = user;
      state.isAuthenticated = true;
      localStorage.setItem(sessionKey, JSON.stringify(user));
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
