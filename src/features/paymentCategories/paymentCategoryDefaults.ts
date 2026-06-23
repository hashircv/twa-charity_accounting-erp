export const defaultPaymentCategoryNames = [
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

export function normalizePaymentCategory(category: string, options = defaultPaymentCategoryNames) {
  return options.includes(category) ? category : options.find((option) => option.includes(category) || category.includes(option)) ?? "";
}
