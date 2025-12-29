import { z } from 'zod';

export const paymentSchema = z.object({
  loanId: z.number().int().positive('Loan ID must be a positive integer'),
  dueDate: z.string().date('Invalid date format'),
  amountDue: z
    .number()
    .positive('Amount due must be positive')
    .finite(),
  amountPaid: z
    .number()
    .nonnegative('Amount paid cannot be negative')
    .finite()
    .optional()
    .nullable(),
  status: z
    .enum(['pending', 'paid', 'overdue', 'missed'])
    .optional()
    .default('pending'),
  paidDate: z.string().date('Invalid date format').optional().nullable(),
});

export const createPaymentSchema = paymentSchema;

export const updatePaymentSchema = paymentSchema.partial();

export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

