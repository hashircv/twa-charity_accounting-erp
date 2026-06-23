import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";
import {
  assistanceFeature,
  auditFeature,
  bankFeature,
  cashAccountFeature,
  beneficiaryFeature,
  collectionFeature,
  commitmentFeature,
  contributionFeature,
  memberFeature,
  paymentFeature,
} from "@/store/features";

export const memberSelectors = memberFeature.adapter.getSelectors((state: RootState) => state.members);
export const collectionSelectors = collectionFeature.adapter.getSelectors((state: RootState) => state.collections);
export const beneficiarySelectors = beneficiaryFeature.adapter.getSelectors((state: RootState) => state.beneficiaries);
export const paymentSelectors = paymentFeature.adapter.getSelectors((state: RootState) => state.payments);
export const commitmentSelectors = commitmentFeature.adapter.getSelectors((state: RootState) => state.commitments);
export const contributionSelectors = contributionFeature.adapter.getSelectors((state: RootState) => state.contributions);
export const bankSelectors = bankFeature.adapter.getSelectors((state: RootState) => state.banks);
export const cashAccountSelectors = cashAccountFeature.adapter.getSelectors((state: RootState) => state.cashAccounts);
export const auditSelectors = auditFeature.adapter.getSelectors((state: RootState) => state.audit);
export const assistanceSelectors = assistanceFeature.adapter.getSelectors((state: RootState) => state.assistance);

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

export const selectDashboardKpis = createSelector(
  [
    collectionSelectors.selectAll,
    paymentSelectors.selectAll,
    bankSelectors.selectAll,
    beneficiarySelectors.selectAll,
    commitmentSelectors.selectAll,
    contributionSelectors.selectAll,
  ],
  (collections, payments, banks, beneficiaries, commitments, contributions) => ({
    totalCollections: collections.reduce((total, item) => total + item.amount.convertedAmount, 0),
    totalDisbursements: payments.reduce((total, item) => total + item.amount.convertedAmount, 0),
    fundsWithExecutives: collections
      .filter((item) => item.depositStatus === "With Executive")
      .reduce((total, item) => total + item.amount.convertedAmount, 0),
    fundsWithTreasurer: collections
      .filter((item) => item.depositStatus === "With Treasurer")
      .reduce((total, item) => total + item.amount.convertedAmount, 0),
    bankBalances: banks.reduce((total, item) => total + item.currentBalance, 0),
    activeBeneficiaries: beneficiaries.filter((item) => item.status === "Active").length,
    activeCommitments: commitments.filter((item) => item.status === "Active").length,
    pendingContributions: contributions.filter((item) => item.collectionStatus === "Pledged").length,
  }),
);

export const selectExecutiveBalances = createSelector([collectionSelectors.selectAll], (collections) =>
  Object.entries(
    collections.reduce<Record<string, number>>((balances, collection) => {
      if (collection.depositStatus === "With Executive") {
        balances[collection.collectedBy] = (balances[collection.collectedBy] ?? 0) + collection.amount.convertedAmount;
      }
      return balances;
    }, {}),
  )
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8),
);
