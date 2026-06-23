import type {
  Assistance,
  AuditLog,
  BankAccount,
  Beneficiary,
  CashAccount,
  Collection,
  Commitment,
  Contribution,
  Member,
  Payment,
  PaymentCategory,
} from "@/types/domain";
import { repositories } from "@/services/repositories";
import { createEntityFeature } from "@/store/entityFeature";

export const memberFeature = createEntityFeature<Member>("members", repositories.members);
export const collectionFeature = createEntityFeature<Collection>("collections", repositories.collections);
export const beneficiaryFeature = createEntityFeature<Beneficiary>("beneficiaries", repositories.beneficiaries);
export const paymentFeature = createEntityFeature<Payment>("payments", repositories.payments);
export const paymentCategoryFeature = createEntityFeature<PaymentCategory>("paymentCategories", repositories.paymentCategories);
export const commitmentFeature = createEntityFeature<Commitment>("commitments", repositories.commitments);
export const contributionFeature = createEntityFeature<Contribution>("contributions", repositories.contributions);
export const bankFeature = createEntityFeature<BankAccount>("banks", repositories.banks);
export const cashAccountFeature = createEntityFeature<CashAccount>("cashAccounts", repositories.cashAccounts);
export const auditFeature = createEntityFeature<AuditLog>("audit", repositories.audit);
export const assistanceFeature = createEntityFeature<Assistance>("assistance", repositories.assistance);

export const featureThunks = [
  memberFeature.fetchAll,
  collectionFeature.fetchAll,
  beneficiaryFeature.fetchAll,
  paymentFeature.fetchAll,
  paymentCategoryFeature.fetchAll,
  commitmentFeature.fetchAll,
  contributionFeature.fetchAll,
  bankFeature.fetchAll,
  cashAccountFeature.fetchAll,
  auditFeature.fetchAll,
  assistanceFeature.fetchAll,
] as const;
