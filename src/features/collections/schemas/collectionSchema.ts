import { z } from "zod";

export const collectionSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    donorName: z.string().min(2),
    donorContact: z.string().min(6),
    currency: z.enum(["KWD", "INR"]),
    amount: z.coerce.number().min(0, "Amount cannot be negative"),
    kwdAmount: z.coerce.number().min(0, "KWD amount cannot be negative"),
    inrAmount: z.coerce.number().min(0, "INR amount cannot be negative"),
    category: z.string().min(1),
    collectedBy: z.string().min(1, "Collected by is required"),
    method: z.enum(["Cash", "Bank Transfer", "Cheque"]),
    depositStatus: z.enum(["With Executive", "With Treasurer", "Deposited"], { required_error: "Select deposit status" }),
    accountType: z.enum(["Cash", "Bank"], { required_error: "Select account type" }),
    accountId: z.string().min(1, "Select account"),
    narration: z.string().max(300).optional(),
  })
  .refine((values) => values.kwdAmount > 0 || values.inrAmount > 0, {
    message: "Enter KWD or INR amount",
    path: ["inrAmount"],
  });

export type CollectionFormValues = z.infer<typeof collectionSchema>;
