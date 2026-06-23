export type MemberDueCategory = "Subscription" | "Sponsorship";
export type MemberDueType = "Monthly" | "Quarterly" | "Yearly" | "One-time";

export interface MemberSubscriptionPlan {
  id: string;
  memberEntityId: string;
  category: MemberDueCategory;
  subscriptionType: MemberDueType;
  fromDate: string;
  toDate?: string;
  amount: number;
  createdAt: string;
}

export interface MemberSubscriptionDue {
  id: string;
  planId: string;
  memberEntityId: string;
  category: MemberDueCategory;
  subscriptionType: MemberDueType;
  fromDate: string;
  toDate: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: "Due" | "Paid";
}

export interface MemberPaidLog {
  id: string;
  memberEntityId: string;
  dueId: string;
  receiptNumber: string;
  date: string;
  category: MemberDueCategory;
  subscriptionType: MemberDueType;
  fromDate: string;
  toDate: string;
  amount: number;
}

interface MemberDueStore {
  plans: MemberSubscriptionPlan[];
  dues: MemberSubscriptionDue[];
  logs: MemberPaidLog[];
}

export const memberDueStorageKey = "twa-member-subscription-dues";

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addSubscriptionPeriod(date: Date, type: MemberDueType) {
  const next = new Date(date);
  if (type === "Quarterly") next.setMonth(next.getMonth() + 3);
  else if (type === "Yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function getPeriodEndDate(start: Date, finalDate: Date, type: MemberDueType) {
  if (type === "One-time") return finalDate;
  const periodEnd = addSubscriptionPeriod(start, type);
  periodEnd.setDate(periodEnd.getDate() - 1);
  return periodEnd > finalDate ? finalDate : periodEnd;
}

function getDueId(planId: string, fromDate: string) {
  return `${planId}__${fromDate}`;
}

function readStore(): MemberDueStore {
  const stored = localStorage.getItem(memberDueStorageKey);
  if (!stored) return { plans: [], dues: [], logs: [] };

  try {
    const parsed = JSON.parse(stored) as Partial<MemberDueStore>;
    return {
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      dues: Array.isArray(parsed.dues) ? parsed.dues : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return { plans: [], dues: [], logs: [] };
  }
}

function writeStore(store: MemberDueStore) {
  localStorage.setItem(memberDueStorageKey, JSON.stringify(store));
  window.dispatchEvent(new StorageEvent("storage", { key: memberDueStorageKey }));
}

function createDuesForPlan(plan: MemberSubscriptionPlan, existingDues: MemberSubscriptionDue[]) {
  const startDate = new Date(plan.fromDate);
  const today = new Date();
  const finalDate = plan.toDate ? new Date(plan.toDate) : today > startDate ? today : startDate;

  if (plan.subscriptionType === "One-time") {
    const dueId = getDueId(plan.id, plan.fromDate);
    const existing = existingDues.find((due) => due.id === dueId);
    return [
      {
        id: dueId,
        planId: plan.id,
        memberEntityId: plan.memberEntityId,
        category: plan.category,
        subscriptionType: plan.subscriptionType,
        fromDate: plan.fromDate,
        toDate: toInputDate(finalDate),
        amount: plan.amount,
        paidAmount: existing?.paidAmount ?? 0,
        dueAmount: Math.max(0, plan.amount - (existing?.paidAmount ?? 0)),
        status: (existing?.paidAmount ?? 0) >= plan.amount ? "Paid" : "Due",
      } satisfies MemberSubscriptionDue,
    ];
  }

  const dues: MemberSubscriptionDue[] = [];
  let cursor = startDate;
  while (cursor <= finalDate) {
    const fromDate = toInputDate(cursor);
    const dueId = getDueId(plan.id, fromDate);
    const existing = existingDues.find((due) => due.id === dueId);
    const paidAmount = existing?.paidAmount ?? 0;
    const periodEnd = getPeriodEndDate(cursor, finalDate, plan.subscriptionType);
    dues.push({
      id: dueId,
      planId: plan.id,
      memberEntityId: plan.memberEntityId,
      category: plan.category,
      subscriptionType: plan.subscriptionType,
      fromDate,
      toDate: toInputDate(periodEnd),
      amount: plan.amount,
      paidAmount,
      dueAmount: Math.max(0, plan.amount - paidAmount),
      status: paidAmount >= plan.amount ? "Paid" : "Due",
    });
    cursor = addSubscriptionPeriod(cursor, plan.subscriptionType);
  }
  return dues;
}

function syncOpenEndedDues(store: MemberDueStore) {
  const generatedDues = store.plans.flatMap((plan) => createDuesForPlan(plan, store.dues));
  const planIds = new Set(store.plans.map((plan) => plan.id));
  const manualDues = store.dues.filter((due) => !planIds.has(due.planId));
  return { ...store, dues: [...generatedDues, ...manualDues] };
}

export function getMemberDues(memberEntityId: string) {
  const synced = syncOpenEndedDues(readStore());
  writeStore(synced);
  return synced.dues.filter((due) => due.memberEntityId === memberEntityId);
}

export function getMemberPaidLogs(memberEntityId: string) {
  return readStore().logs.filter((log) => log.memberEntityId === memberEntityId);
}

export function createMemberSubscriptionPlan(
  memberEntityId: string,
  values: {
    category: MemberDueCategory;
    subscriptionType: MemberDueType;
    fromDate: string;
    toDate?: string;
    amount: number;
  },
) {
  const store = readStore();
  const plan: MemberSubscriptionPlan = {
    id: crypto.randomUUID(),
    memberEntityId,
    category: values.category,
    subscriptionType: values.subscriptionType,
    fromDate: values.fromDate,
    toDate: values.toDate || undefined,
    amount: values.amount,
    createdAt: new Date().toISOString(),
  };
  const nextStore = syncOpenEndedDues({ ...store, plans: [plan, ...store.plans] });
  writeStore(nextStore);
  return nextStore.dues.filter((due) => due.planId === plan.id);
}

export function markMemberDuePaid({
  memberEntityId,
  dueId,
  receiptNumber,
  date,
  amount,
}: {
  memberEntityId: string;
  dueId: string;
  receiptNumber: string;
  date: string;
  amount: number;
}) {
  const store = syncOpenEndedDues(readStore());
  const due = store.dues.find((item) => item.id === dueId && item.memberEntityId === memberEntityId);
  if (!due) return;

  const paidAmount = Math.min(due.amount, due.paidAmount + amount);
  const updatedDue: MemberSubscriptionDue = {
    ...due,
    paidAmount,
    dueAmount: Math.max(0, due.amount - paidAmount),
    status: paidAmount >= due.amount ? "Paid" : "Due",
  };
  const log: MemberPaidLog = {
    id: crypto.randomUUID(),
    memberEntityId,
    dueId,
    receiptNumber,
    date,
    category: due.category,
    subscriptionType: due.subscriptionType,
    fromDate: due.fromDate,
    toDate: due.toDate,
    amount: Math.min(amount, due.dueAmount),
  };

  writeStore({
    ...store,
    dues: store.dues.map((item) => (item.id === due.id ? updatedDue : item)),
    logs: [log, ...store.logs],
  });
}
