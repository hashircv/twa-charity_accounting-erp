import { faker } from "@faker-js/faker";
import { addMonths, formatISO, subDays, subMonths } from "date-fns";
import type {
  Assistance,
  AssistanceCategory,
  AuditLog,
  BankAccount,
  Beneficiary,
  CashAccount,
  Collection,
  CollectionCategory,
  Commitment,
  Contribution,
  Currency,
  ExchangeRate,
  Member,
  Payment,
  PaymentCategory,
  User,
  UserRole,
} from "@/types/domain";
import { defaultPaymentCategoryNames } from "@/features/paymentCategories/paymentCategoryDefaults";
import { convertCurrency } from "@/utils/currency";
import { rolePermissions } from "@/constants/permissions";

faker.seed(4107);

const roles: UserRole[] = ["President", "Secretary", "Treasurer", "Executive Member", "General Member"];
const currencies: Currency[] = ["KWD", "INR"];
const assistanceCategories = [
  "Monthly Food Kit",
  "Monthly Medical Aid",
  "Medical Emergency",
  "Widow Pension",
  "Self Employment Support",
  "Education Assistance",
  "Debt Clearance",
  "House Maintenance Support",
  "Dialysis Assistance",
  "Ramadan Kit",
  "Eid Kit",
  "Social Commitment",
  "Disabled Community Support",
];
const collectionCategories: CollectionCategory[] = [
  "Membership Fee",
  "Monthly Subscription",
  "Ramadan Collection",
  "General Charity Collection",
  "Bank Interest Income",
  "Chitty Income",
  "Coin Box",
  "Other Income",
];

const stamp = (index: number) => {
  const now = subDays(new Date(), index % 90).toISOString();
  return {
    id: `mock-${index}`,
    createdAt: now,
    updatedAt: now,
    createdBy: "mock-seeder",
    updatedBy: "mock-seeder",
  };
};

export const exchangeRates: ExchangeRate[] = Array.from({ length: 30 }, (_, index) => {
  const date = subMonths(new Date(), 29 - index);
  return {
    ...stamp(index),
    id: `rate-${index}`,
    date: formatISO(date, { representation: "date" }),
    from: "KWD",
    to: "INR",
    rate: Number(faker.finance.amount({ min: 270, max: 286, dec: 2 })),
    locked: true,
  };
});

export const currentUser: User = {
  ...stamp(1),
  id: "user-admin",
  name: "TWA Administrator",
  email: "admin@twakuwait.org",
  role: "Administrator",
  permissions: rolePermissions.Administrator,
  lastLoginAt: new Date().toISOString(),
};

export const members: Member[] = Array.from({ length: 10 }, (_, index) => {
  const role = faker.helpers.arrayElement(roles);
  return {
    ...stamp(index),
    id: `member-${index + 1}`,
    memberId: `TWA-M-${String(index + 1).padStart(4, "0")}`,
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 75 }),
    contactNumber: faker.phone.number({ style: "international" }),
    whatsappNumber: faker.phone.number({ style: "international" }),
    kuwaitAddress: `${faker.location.streetAddress()}, Kuwait`,
    civilId: faker.datatype.boolean() ? faker.string.numeric(12) : undefined,
    joiningDate: subMonths(new Date(), faker.number.int({ min: 1, max: 90 })).toISOString(),
    status: faker.helpers.arrayElement(["Active", "Inactive"] as const),
    role,
  };
});

export const beneficiaries: Beneficiary[] = Array.from({ length: 18 }, (_, index) => ({
  ...stamp(index),
  id: `beneficiary-${index + 1}`,
  beneficiaryId: `TWA-B-${String(index + 1).padStart(4, "0")}`,
  name: faker.person.fullName(),
  familyDetails: `${faker.number.int({ min: 1, max: 7 })} dependents`,
  address: faker.location.streetAddress({ useFullAddress: true }),
  mobileNumber: faker.phone.number({ style: "international" }),
  bankName: faker.company.name(),
  bankAccountNumber: faker.finance.accountNumber(14),
  ifscCode: `IFSC${faker.string.alphanumeric({ length: 7, casing: "upper" })}`,
  branchName: `${faker.location.city()} Branch`,
  location: faker.location.city(),
  incomeStatus: faker.helpers.arrayElement(["No Income", "Low Income", "Irregular Income"] as const),
  category: faker.helpers.arrayElement(assistanceCategories),
  caseDocuments: ["application.pdf", "income-certificate.pdf"],
  approvalAssignedTo: faker.helpers.arrayElement(["Administrator", "President", "Secretary"]),
  requestDate: subDays(new Date(), faker.number.int({ min: 1, max: 500 })).toISOString(),
  status: faker.helpers.arrayElement(["Pending", "Approved", "Active", "Closed"] as const),
}));

export const collections: Collection[] = Array.from({ length:10 }, (_, index) => {
  const date = subDays(new Date(), faker.number.int({ min: 1, max: 365 })).toISOString();
  const currency = faker.helpers.arrayElement(currencies);
  const amount = convertCurrency(
    faker.number.int({ min: currency === "KWD" ? 5 : 500, max: currency === "KWD" ? 900 : 150000 }),
    currency,
    date,
    exchangeRates,
  );
  return {
    ...stamp(index),
    id: `collection-${index + 1}`,
    receiptNumber: `RCPT-${String(index + 1).padStart(6, "0")}`,
    date,
    donorName: faker.person.fullName(),
    donorContact: faker.phone.number({ style: "international" }),
    amount,
    category: faker.helpers.arrayElement(collectionCategories),
    collectedBy: faker.helpers.arrayElement(members).name,
    method: faker.helpers.arrayElement(["Cash", "Bank Transfer", "Cheque"] as const),
    accountType: "Cash",
    accountId: "cash-treasurer",
    accountName: "Treasurer Cash",
    depositStatus: faker.helpers.arrayElement(["With Executive", "With Treasurer", "Deposited"] as const),
    narration: faker.finance.transactionDescription(),
  };
});

export const bankAccounts: BankAccount[] = [
  {
    ...stamp(1),
    id: "bank-kuwait-main",
    accountName: "TWA Kuwait Main Account",
    accountNumber: "KW-001-992281",
    accountType: "Kuwait Bank",
    currency: "KWD",
    branch: "Farwaniya",
    openingBalance: 4500,
    currentBalance: 18750,
    reconciliationStatus: "Pending",
  },
  {
    ...stamp(2),
    id: "bank-india-main",
    accountName: "TWA India Relief Account",
    accountNumber: "IN-4488-20001",
    accountType: "India Bank",
    currency: "INR",
    branch: "Kozhikode",
    openingBalance: 850000,
    currentBalance: 3240000,
    reconciliationStatus: "Matched",
  },
];

export const cashAccounts: CashAccount[] = [
  {
    ...stamp(3),
    id: "cash-treasurer",
    userName: "Treasurer",
    phoneNumber: "+965 5555 0001",
    currentBalance: 0,
  },
  {
    ...stamp(4),
    id: "cash-executive-main",
    userName: "Executive Cash Holder",
    phoneNumber: "+965 5555 0002",
    currentBalance: 0,
  },
];

export const payments: Payment[] = Array.from({ length: 15 }, (_, index) => {
  const beneficiary = faker.helpers.arrayElement(beneficiaries);
  const date = subDays(new Date(), faker.number.int({ min: 1, max: 365 })).toISOString();
  const currency = faker.helpers.arrayElement(currencies);
  return {
    ...stamp(index),
    id: `payment-${index + 1}`,
    voucherNumber: `VCH-${String(index + 1).padStart(6, "0")}`,
    date,
    beneficiaryId: beneficiary.beneficiaryId,
    beneficiaryName: beneficiary.name,
    category: faker.helpers.arrayElement(defaultPaymentCategoryNames),
    amount: convertCurrency(
      faker.number.int({ min: currency === "KWD" ? 10 : 1000, max: currency === "KWD" ? 600 : 90000 }),
      currency,
      date,
      exchangeRates,
    ),
    method: faker.helpers.arrayElement(["Bank", "Cash"] as const),
    accountId: "cash-treasurer",
    accountName: "Treasurer Cash",
    approvedBy: faker.helpers.arrayElement(members).name,
    paidBy: faker.helpers.arrayElement(members).name,
    narration: faker.finance.transactionDescription(),
    status: faker.helpers.arrayElement(["Pending", "Approved", "Paid"] as const),
  };
});

export const paymentCategories: PaymentCategory[] = defaultPaymentCategoryNames.map((name, index) => ({
  ...stamp(index + 500),
  id: `payment-category-${index + 1}`,
  name,
  description: `${name} payment category`,
  status: "Active",
}));

export const commitments: Commitment[] = Array.from({ length: 10 }, (_, index) => {
  const beneficiary = faker.helpers.arrayElement(beneficiaries);
  const monthly = faker.number.int({ min: 3000, max: 20000 });
  const total = monthly * faker.number.int({ min: 6, max: 24 });
  const paid = faker.number.int({ min: 0, max: total });
  const date = subMonths(new Date(), faker.number.int({ min: 1, max: 18 })).toISOString();
  return {
    ...stamp(index),
    id: `commitment-${index + 1}`,
    beneficiaryId: beneficiary.id,
    category: faker.helpers.arrayElement(assistanceCategories),
    approvalDate: date,
    approvedBy: faker.helpers.arrayElement(members).name,
    totalApproved: convertCurrency(total, "INR", date, exchangeRates),
    amountPaid: paid,
    remainingBalance: total - paid,
    futureLiability: Math.max(0, total - paid),
    paymentFrequency: faker.helpers.arrayElement(["Monthly", "Quarterly", "One-time"] as const),
    paymentPeriod: `${formatISO(date, { representation: "date" })} to ${formatISO(addMonths(date, 12), { representation: "date" })}`,
    status: faker.helpers.arrayElement(["Active", "Closed"] as const),
  };
});

export const contributions: Contribution[] = Array.from({ length: 15 }, (_, index) => {
  const date = subDays(new Date(), faker.number.int({ min: 1, max: 365 })).toISOString();
  const currency = faker.helpers.arrayElement(currencies);
  return {
    ...stamp(index),
    id: `contribution-${index + 1}`,
    caseReferenceNumber: faker.helpers.arrayElement(beneficiaries).beneficiaryId,
    contributorName: faker.person.fullName(),
    contributorRole: faker.helpers.arrayElement(roles),
    contributionType: faker.helpers.arrayElement(["One-time", "Recurring"] as const),
    amount: convertCurrency(
      faker.number.int({ min: currency === "KWD" ? 5 : 500, max: currency === "KWD" ? 500 : 50000 }),
      currency,
      date,
      exchangeRates,
    ),
    paymentMethod: faker.helpers.arrayElement(["Cash", "Bank Transfer", "Cheque"] as const),
    collectionStatus: faker.helpers.arrayElement(["Pledged", "Received", "Overdue"] as const),
    narration: faker.finance.transactionDescription(),
  };
});

export const assistanceRecords: Assistance[] = Array.from({ length: 15 }, (_, index) => {
  const beneficiary = faker.helpers.arrayElement(beneficiaries);
  const date = subDays(new Date(), faker.number.int({ min: 1, max: 365 })).toISOString();
  const currency = faker.helpers.arrayElement(currencies);
  const category = faker.helpers.arrayElement(assistanceCategories) as AssistanceCategory;
  return {
    ...stamp(index),
    id: `assistance-${index + 1}`,
    assistanceId: `TWA-A-${String(index + 1).padStart(4, "0")}`,
    beneficiaryId: beneficiary.id,
    beneficiaryName: beneficiary.name,
    category,
    amount: convertCurrency(
      faker.number.int({ min: currency === "KWD" ? 5 : 500, max: currency === "KWD" ? 300 : 50000 }),
      currency,
      date,
      exchangeRates,
    ),
    deliveryDate: date,
    deliveryMethod: faker.helpers.arrayElement(["Cash", "Bank Transfer", "In-Kind"] as const),
    approvedBy: faker.helpers.arrayElement(members).name,
    handledBy: faker.helpers.arrayElement(members).name,
    narration: faker.finance.transactionDescription(),
    status: faker.helpers.arrayElement(["Pending", "Approved", "Delivered", "Cancelled"] as const),
  };
});

export const auditLogs: AuditLog[] = Array.from({ length: 13 }, (_, index) => ({
  ...stamp(index),
  id: `audit-${index + 1}`,
  user: faker.helpers.arrayElement(members).name,
  action: faker.helpers.arrayElement(["Created", "Updated", "Approved", "Closed", "Logged in"]),
  module: faker.helpers.arrayElement(["Collections", "Members", "Payments", "Commitments", "Reports"]),
  timestamp: subDays(new Date(), faker.number.int({ min: 0, max: 45 })).toISOString(),
  previousValue: { status: "Pending" },
  newValue: { status: faker.helpers.arrayElement(["Approved", "Active", "Paid"]) },
}));
