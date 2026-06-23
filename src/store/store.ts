import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "@/features/auth/store/authSlice";
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

export const store = configureStore({
  reducer: {
    auth: authReducer,
    members: memberFeature.reducer,
    collections: collectionFeature.reducer,
    beneficiaries: beneficiaryFeature.reducer,
    payments: paymentFeature.reducer,
    commitments: commitmentFeature.reducer,
    contributions: contributionFeature.reducer,
    banks: bankFeature.reducer,
    cashAccounts: cashAccountFeature.reducer,
    audit: auditFeature.reducer,
    assistance: assistanceFeature.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
