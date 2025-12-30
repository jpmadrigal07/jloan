import { z } from 'zod';

export const budgetSchema = z.object({
  monthlyAllocation: z
    .number()
    .positive('Monthly allocation must be positive')
    .finite(),
  effectiveDate: z.string().date('Invalid date format'),
  isActive: z.boolean(),
  notes: z.string().optional().nullable(),
});

export const createBudgetSchema = budgetSchema;

export const updateBudgetSchema = budgetSchema.partial();

export type BudgetInput = z.infer<typeof budgetSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

