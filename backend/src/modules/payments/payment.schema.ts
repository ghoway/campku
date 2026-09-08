import { z } from "zod";

export const CreateCashPaymentSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER", "QRIS", "OTHER"]),
  amount: z.number().int().positive(),
  shiftId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const MidtransNotificationSchema = z.object({
  order_id: z.string(),
  status_code: z.string(),
  transaction_status: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
});