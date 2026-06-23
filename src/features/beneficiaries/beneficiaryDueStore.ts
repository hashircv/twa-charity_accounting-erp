export type BeneficiaryDueCategory = string;
export type BeneficiaryDueType = "Monthly" | "Quarterly" | "Yearly" | "One-time";

export interface BeneficiaryPaymentDue {
  id: string;
  planId: string;
  beneficiaryEntityId: string;
  category: BeneficiaryDueCategory;
  supportType: BeneficiaryDueType;
  fromDate: string;
  toDate: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: "Due" | "Paid";
}

export interface BeneficiaryPaymentPlan {
  id: string;
  beneficiaryEntityId: string;
  category: BeneficiaryDueCategory;
  supportType: BeneficiaryDueType;
  fromDate: string;
  toDate?: string;
  amount: number;
  createdAt: string;
}

export interface BeneficiaryPaymentLog {
  id: string;
  beneficiaryEntityId: string;
  dueId: string;
  voucherNumber: string;
  date: string;
  category: BeneficiaryDueCategory;
  supportType: BeneficiaryDueType;
  fromDate: string;
  toDate: string;
  amount: number;
}

interface BeneficiaryDueStore {
  plans: BeneficiaryPaymentPlan[];
  dues: BeneficiaryPaymentDue[];
  logs: BeneficiaryPaymentLog[];
}

export const beneficiaryDueStorageKey = "twa-beneficiary-payment-dues";

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addSupportPeriod(date: Date, type: BeneficiaryDueType) {
  const next = new Date(date);
  if (type === "Quarterly") next.setMonth(next.getMonth() + 3);
  else if (type === "Yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function getPeriodEndDate(start: Date, finalDate: Date, type: BeneficiaryDueType) {
  if (type === "One-time") return finalDate;
  const periodEnd = addSupportPeriod(start, type);
  periodEnd.setDate(periodEnd.getDate() - 1);
  return periodEnd > finalDate ? finalDate : periodEnd;
}

function getDueId(planId: string, fromDate: string) {
  return `${planId}__${fromDate}`;
}

function readStore(): BeneficiaryDueStore {
  const stored = localStorage.getItem(beneficiaryDueStorageKey);
  if (!stored) return { plans: [], dues: [], logs: [] };

  try {
    const parsed = JSON.parse(stored) as Partial<BeneficiaryDueStore>;
    return {
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      dues: Array.isArray(parsed.dues) ? parsed.dues : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return { plans: [], dues: [], logs: [] };
  }
}

function writeStore(store: BeneficiaryDueStore) {
  localStorage.setItem(beneficiaryDueStorageKey, JSON.stringify(store));
  window.dispatchEvent(new StorageEvent("storage", { key: beneficiaryDueStorageKey }));
}

function createDuesForPlan(plan: BeneficiaryPaymentPlan, existingDues: BeneficiaryPaymentDue[]) {
  const startDate = new Date(plan.fromDate);
  const today = new Date();
  const finalDate = plan.toDate ? new Date(plan.toDate) : today > startDate ? today : startDate;

  if (plan.supportType === "One-time") {
    const dueId = getDueId(plan.id, plan.fromDate);
    const existing = existingDues.find((due) => due.id === dueId);
    const paidAmount = existing?.paidAmount ?? 0;
    return [
      {
        id: dueId,
        planId: plan.id,
        beneficiaryEntityId: plan.beneficiaryEntityId,
        category: plan.category,
        supportType: plan.supportType,
        fromDate: plan.fromDate,
        toDate: toInputDate(finalDate),
        amount: plan.amount,
        paidAmount,
        dueAmount: Math.max(0, plan.amount - paidAmount),
        status: paidAmount >= plan.amount ? "Paid" : "Due",
      } satisfies BeneficiaryPaymentDue,
    ];
  }

  const dues: BeneficiaryPaymentDue[] = [];
  let cursor = startDate;
  while (cursor <= finalDate) {
    const fromDate = toInputDate(cursor);
    const dueId = getDueId(plan.id, fromDate);
    const existing = existingDues.find((due) => due.id === dueId);
    const paidAmount = existing?.paidAmount ?? 0;
    const periodEnd = getPeriodEndDate(cursor, finalDate, plan.supportType);
    dues.push({
      id: dueId,
      planId: plan.id,
      beneficiaryEntityId: plan.beneficiaryEntityId,
      category: plan.category,
      supportType: plan.supportType,
      fromDate,
      toDate: toInputDate(periodEnd),
      amount: plan.amount,
      paidAmount,
      dueAmount: Math.max(0, plan.amount - paidAmount),
      status: paidAmount >= plan.amount ? "Paid" : "Due",
    });
    cursor = addSupportPeriod(cursor, plan.supportType);
  }
  return dues;
}

function syncDues(store: BeneficiaryDueStore) {
  const generatedDues = store.plans.flatMap((plan) => createDuesForPlan(plan, store.dues));
  const planIds = new Set(store.plans.map((plan) => plan.id));
  const manualDues = store.dues.filter((due) => !planIds.has(due.planId));
  return { ...store, dues: [...generatedDues, ...manualDues] };
}

export function getBeneficiaryDues(beneficiaryEntityId: string) {
  const synced = syncDues(readStore());
  writeStore(synced);
  return synced.dues.filter((due) => due.beneficiaryEntityId === beneficiaryEntityId);
}

export function getBeneficiaryPaymentLogs(beneficiaryEntityId: string) {
  return readStore().logs.filter((log) => log.beneficiaryEntityId === beneficiaryEntityId);
}

export function createBeneficiaryDue(
  beneficiaryEntityId: string,
  values: {
    category: BeneficiaryDueCategory;
    supportType: BeneficiaryDueType;
    fromDate: string;
    toDate?: string;
    amount: number;
  },
) {
  const store = readStore();
  const plan: BeneficiaryPaymentPlan = {
    id: crypto.randomUUID(),
    beneficiaryEntityId,
    category: values.category,
    supportType: values.supportType,
    fromDate: values.fromDate,
    toDate: values.toDate || undefined,
    amount: values.amount,
    createdAt: new Date().toISOString(),
  };
  const nextStore = syncDues({ ...store, plans: [plan, ...store.plans] });
  writeStore(nextStore);
  return nextStore.dues.filter((due) => due.planId === plan.id);
}

export function markBeneficiaryDuePaid({
  beneficiaryEntityId,
  dueId,
  voucherNumber,
  date,
  amount,
}: {
  beneficiaryEntityId: string;
  dueId: string;
  voucherNumber: string;
  date: string;
  amount: number;
}) {
  const store = syncDues(readStore());
  const due = store.dues.find((item) => item.id === dueId && item.beneficiaryEntityId === beneficiaryEntityId);
  if (!due) return;

  const paidAmount = Math.min(due.amount, due.paidAmount + amount);
  const updatedDue: BeneficiaryPaymentDue = {
    ...due,
    paidAmount,
    dueAmount: Math.max(0, due.amount - paidAmount),
    status: paidAmount >= due.amount ? "Paid" : "Due",
  };
  const log: BeneficiaryPaymentLog = {
    id: crypto.randomUUID(),
    beneficiaryEntityId,
    dueId,
    voucherNumber,
    date,
    category: due.category,
    supportType: due.supportType,
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
