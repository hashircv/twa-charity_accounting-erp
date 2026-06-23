export type Currency = "KWD" | "INR";

export type UserRole =
  | "Administrator"
  | "President"
  | "Secretary"
  | "Treasurer"
  | "Executive Member"
  | "General Member";

export type EntityStatus = "Active" | "Inactive" | "Closed" | "Pending" | "Approved";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  lastLoginAt?: string;
}

export type Permission =
  | "dashboard:view"
  | "members:manage"
  | "collections:manage"
  | "custody:manage"
  | "beneficiaries:manage"
  | "payments:approve"
  | "reports:export"
  | "settings:manage"
  | "audit:view";

export interface Money {
  originalAmount: number;
  currency: Currency;
  exchangeRate: number;
  convertedAmount: number;
}

export interface Member extends BaseEntity {
  memberId: string;
  name: string;
  profilePhoto?: string;
  age: number;
  contactNumber: string;
  whatsappNumber: string;
  kuwaitAddress: string;
  civilId?: string;
  joiningDate: string;
  status: "Active" | "Inactive";
  role: UserRole;
}

export type CollectionCategory =
  | "Membership Fee"
  | "Monthly Subscription"
  | "Ramadan Collection"
  | "General Charity Collection"
  | "Bank Interest Income"
  | "Chitty Income"
  | "Coin Box"
  | "Other Income";

export interface Collection extends BaseEntity {
  receiptNumber: string;
  date: string;
  donorName: string;
  donorContact: string;
  amount: Money;
  category: CollectionCategory;
  collectedBy: string;
  method: "Cash" | "Bank Transfer" | "Cheque";
  accountType: "Cash" | "Bank";
  accountId: string;
  accountName: string;
  depositStatus: "With Executive" | "With Treasurer" | "Deposited";
  narration: string;
}

export interface BankAccount extends BaseEntity {
  accountName: string;
  accountNumber: string;
  accountType: "Kuwait Bank" | "India Bank";
  currency: Currency;
  branch: string;
  openingBalance: number;
  currentBalance: number;
  reconciliationStatus: "Matched" | "Pending";
}

export interface CashAccount extends BaseEntity {
  userName: string;
  phoneNumber: string;
  currentBalance: number;
}

export interface Beneficiary extends BaseEntity {
  beneficiaryId: string;
  name: string;
  familyDetails: string;
  address: string;
  mobileNumber: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  branchName: string;
  location: string;
  incomeStatus: "No Income" | "Low Income" | "Irregular Income";
  category: string;
  caseDocuments: string[];
  approvalAssignedTo: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Active" | "Closed";
}

export interface Commitment extends BaseEntity {
  beneficiaryId: string;
  category: string;
  approvalDate: string;
  approvedBy: string;
  totalApproved: Money;
  amountPaid: number;
  remainingBalance: number;
  futureLiability: number;
  paymentFrequency: "Monthly" | "Quarterly" | "One-time";
  paymentPeriod: string;
  status: "Active" | "Closed";
}

export type AssistanceCategory =
  | "Monthly Food Kit"
  | "Monthly Medical Aid"
  | "Medical Emergency"
  | "Widow Pension"
  | "Self Employment Support"
  | "Education Assistance"
  | "Debt Clearance"
  | "House Maintenance"
  | "Dialysis Assistance"
  | "Ramadan Kit"
  | "Eid Kit"
  | "Social Commitment"
  | "Disabled Community Support";

export interface Assistance extends BaseEntity {
  assistanceId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  category: AssistanceCategory;
  amount: Money;
  deliveryDate: string;
  deliveryMethod: "Cash" | "Bank Transfer" | "In-Kind";
  approvedBy: string;
  handledBy: string;
  narration: string;
  status: "Pending" | "Approved" | "Delivered" | "Cancelled";
}

export interface Payment extends BaseEntity {
  voucherNumber: string;
  date: string;
  beneficiaryId: string;
  beneficiaryName: string;
  category: string;
  amount: Money;
  method: "Bank" | "Cash";
  accountId: string;
  accountName: string;
  approvedBy: string;
  paidBy: string;
  narration: string;
  status: "Pending" | "Approved" | "Paid";
}

export interface Contribution extends BaseEntity {
  caseReferenceNumber: string;
  contributorName: string;
  contributorRole: UserRole;
  contributionType: "One-time" | "Recurring";
  amount: Money;
  paymentMethod: "Cash" | "Bank Transfer" | "Cheque";
  collectionStatus: "Pledged" | "Received" | "Overdue";
  narration: string;
}

export interface Ledger extends BaseEntity {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  currency: Currency;
  date: string;
  narration: string;
}

export interface ExchangeRate extends BaseEntity {
  date: string;
  from: Currency;
  to: Currency;
  rate: number;
  locked: true;
}

export interface AuditLog extends BaseEntity {
  user: string;
  action: string;
  module: string;
  timestamp: string;
  previousValue: unknown;
  newValue: unknown;
}
