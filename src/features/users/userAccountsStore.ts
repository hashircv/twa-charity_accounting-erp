import type { UserRole } from "@/types/domain";

export interface UserAccount {
  id: string;
  memberId: string;
  username: string;
  password: string;
  role: UserRole;
}

export const userAccountsStorageKey = "twa-user-accounts";

export function readUserAccounts() {
  const stored = localStorage.getItem(userAccountsStorageKey);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as UserAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeUserAccounts(accounts: UserAccount[]) {
  localStorage.setItem(userAccountsStorageKey, JSON.stringify(accounts));
  window.dispatchEvent(new StorageEvent("storage", { key: userAccountsStorageKey }));
}
