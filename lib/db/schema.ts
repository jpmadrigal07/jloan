import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  pgEnum,
  decimal,
  date,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const sourceTypeEnum = pgEnum('source_type', [
  'bank',
  'mobile_app',
  'person',
]);

export const paymentFrequencyEnum = pgEnum('payment_frequency', [
  'monthly',
  'bi_weekly',
  'weekly',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'current',
  'upcoming',
  'overdue',
]);

export const strategyTypeEnum = pgEnum('strategy_type', [
  'snowball',
  'avalanche',
  'custom',
]);

export const paymentRecordStatusEnum = pgEnum('payment_record_status', [
  'pending',
  'paid',
  'overdue',
  'missed',
]);

// Loans table
export const loans = pgTable('loans', {
  id: serial('id').primaryKey(),
  sourceType: sourceTypeEnum('source_type').notNull(),
  lenderName: varchar('lender_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 100 }),
  principalAmount: decimal('principal_amount', { precision: 12, scale: 2 })
    .notNull()
    .$type<number>(),
  currentBalance: decimal('current_balance', { precision: 12, scale: 2 })
    .notNull()
    .$type<number>(),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 })
    .notNull()
    .$type<number>(),
  loanTermMonths: integer('loan_term_months').notNull(),
  startDate: date('start_date').notNull(),
  paymentFrequency: paymentFrequencyEnum('payment_frequency').notNull(),
  minimumPayment: decimal('minimum_payment', { precision: 12, scale: 2 })
    .notNull()
    .$type<number>(),
  nextPaymentDueDate: date('next_payment_due_date').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull(),
  strategyType: strategyTypeEnum('strategy_type'),
  priorityOrder: integer('priority_order'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Upcoming payments table
export const upcomingPayments = pgTable('upcoming_payments', {
  id: serial('id').primaryKey(),
  loanId: integer('loan_id')
    .notNull()
    .references(() => loans.id, { onDelete: 'cascade' }),
  dueDate: date('due_date').notNull(),
  amountDue: decimal('amount_due', { precision: 12, scale: 2 })
    .notNull()
    .$type<number>(),
  amountPaid: decimal('amount_paid', { precision: 12, scale: 2 })
    .$type<number>(),
  status: paymentRecordStatusEnum('status').notNull().default('pending'),
  paidDate: date('paid_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Monthly budget table
export const monthlyBudget = pgTable('monthly_budget', {
  id: serial('id').primaryKey(),
  monthlyAllocation: decimal('monthly_allocation', { precision: 12, scale: 2 })
    .notNull()
    .$type<number>(),
  effectiveDate: date('effective_date').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const loansRelations = relations(loans, ({ many }) => ({
  upcomingPayments: many(upcomingPayments),
}));

export const upcomingPaymentsRelations = relations(
  upcomingPayments,
  ({ one }) => ({
    loan: one(loans, {
      fields: [upcomingPayments.loanId],
      references: [loans.id],
    }),
  })
);

// Type exports
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type UpcomingPayment = typeof upcomingPayments.$inferSelect;
export type NewUpcomingPayment = typeof upcomingPayments.$inferInsert;

export type MonthlyBudget = typeof monthlyBudget.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudget.$inferInsert;
