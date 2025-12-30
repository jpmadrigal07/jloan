CREATE TYPE "public"."payment_frequency" AS ENUM('monthly', 'bi_weekly', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('pending', 'paid', 'overdue', 'missed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('current', 'upcoming', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('bank', 'mobile_app', 'person');--> statement-breakpoint
CREATE TYPE "public"."strategy_type" AS ENUM('snowball', 'avalanche', 'custom');--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" "source_type" NOT NULL,
	"lender_name" varchar(255) NOT NULL,
	"account_number" varchar(100),
	"principal_amount" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"loan_term_months" integer NOT NULL,
	"start_date" date NOT NULL,
	"payment_frequency" "payment_frequency" NOT NULL,
	"minimum_payment" numeric(12, 2) NOT NULL,
	"next_payment_due_date" date NOT NULL,
	"payment_status" "payment_status" NOT NULL,
	"strategy_type" "strategy_type",
	"priority_order" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_budget" (
	"id" serial PRIMARY KEY NOT NULL,
	"monthly_allocation" numeric(12, 2) NOT NULL,
	"effective_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upcoming_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount_due" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2),
	"status" "payment_record_status" DEFAULT 'pending' NOT NULL,
	"paid_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "upcoming_payments" ADD CONSTRAINT "upcoming_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;