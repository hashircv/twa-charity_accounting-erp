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
} from "@/services/mock/mockData";
import { MockRepository } from "@/services/repositories/MockRepository";

export const repositories = {
  members: new MockRepository(members, "member"),
  collections: new MockRepository(collections, "collection"),
  beneficiaries: new MockRepository(beneficiaries, "beneficiary"),
  payments: new MockRepository(payments, "payment"),
  commitments: new MockRepository(commitments, "commitment"),
  contributions: new MockRepository(contributions, "contribution"),
  banks: new MockRepository(bankAccounts, "bank"),
  cashAccounts: new MockRepository(cashAccounts, "cash-account"),
  audit: new MockRepository(auditLogs, "audit"),
  assistance: new MockRepository(assistanceRecords, "assistance"),
};
