import { z } from 'zod';

export const loanSchema = z.object({
  sourceType: z.enum(['bank', 'mobile_app', 'person']),
  lenderName: z.string().min(1, 'Lender name is required').max(255),
  accountNumber: z.string().max(100).optional().nullable(),
  principalAmount: z
    .number()
    .positive('Principal amount must be positive')
    .finite(),
  currentBalance: z
    .number()
    .nonnegative('Current balance cannot be negative')
    .finite(),
  interestRate: z
    .number()
    .nonnegative('Interest rate cannot be negative')
    .max(100, 'Interest rate cannot exceed 100%')
    .finite(),
  loanTermMonths: z
    .number()
    .int('Loan term must be an integer')
    .positive('Loan term must be positive'),
  startDate: z.string().date('Invalid date format'),
  paymentFrequency: z.enum(['monthly', 'bi_weekly', 'weekly']),
  minimumPayment: z
    .number()
    .positive('Minimum payment must be positive')
    .finite(),
  nextPaymentDueDate: z.string().date('Invalid date format'),
  paymentStatus: z.enum(['current', 'upcoming', 'overdue']),
  strategyType: z.enum(['snowball', 'avalanche', 'custom']).optional().nullable(),
  priorityOrder: z.number().int().positive().optional().nullable(),
  isActive: z.boolean(),
});

export const createLoanSchema = loanSchema;

export const updateLoanSchema = loanSchema.partial();

export type LoanInput = z.infer<typeof loanSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;

