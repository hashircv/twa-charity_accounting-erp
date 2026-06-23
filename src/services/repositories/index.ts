import {
  assistanceRecords,
  auditLogs,
  bankAccounts,
  cashAccounts,
  beneficiaries,
  collections,
  commitments,
  contributions,
  members,
  payments,
  paymentCategories,
} from "@/services/mock/mockData";
import { MockRepository } from "@/services/repositories/MockRepository";

export const repositories = {
  members: new MockRepository(members, "member"),
  collections: new MockRepository(collections, "collection"),
  beneficiaries: new MockRepository(beneficiaries, "beneficiary"),
  payments: new MockRepository(payments, "payment"),
  paymentCategories: new MockRepository(paymentCategories, "payment-category"),
  commitments: new MockRepository(commitments, "commitment"),
  contributions: new MockRepository(contributions, "contribution"),
  banks: new MockRepository(bankAccounts, "bank"),
  cashAccounts: new MockRepository(cashAccounts, "cash-account"),
  audit: new MockRepository(auditLogs, "audit"),
  assistance: new MockRepository(assistanceRecords, "assistance"),
};
