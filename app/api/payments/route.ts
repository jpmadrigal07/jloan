import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upcomingPayments, loans } from '@/lib/db/schema';
import { createPaymentSchema } from '@/lib/validations/payment-schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// GET /api/payments - Get upcoming payments (with loan details)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = db
      .select({
        payment: upcomingPayments,
        loan: loans,
      })
      .from(upcomingPayments)
      .innerJoin(loans, eq(upcomingPayments.loanId, loans.id));

    const conditions = [];
    if (status) {
      conditions.push(
        eq(upcomingPayments.status, status as 'pending' | 'paid' | 'overdue' | 'missed')
      );
    }
    if (startDate) {
      conditions.push(gte(upcomingPayments.dueDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(upcomingPayments.dueDate, endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const payments = await query;

    return NextResponse.json(payments, { status: 200 });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments - Record payment made
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    const newPayment = await db
      .insert(upcomingPayments)
      .values({
        loanId: validatedData.loanId,
        dueDate: validatedData.dueDate,
        amountDue: validatedData.amountDue.toString(),
        amountPaid: validatedData.amountPaid?.toString() ?? null,
        status: validatedData.status ?? 'pending',
        paidDate: validatedData.paidDate ?? null,
      })
      .returning();

    // If payment is marked as paid, update loan balance
    if (validatedData.status === 'paid' && validatedData.amountPaid) {
      const loan = await db
        .select()
        .from(loans)
        .where(eq(loans.id, validatedData.loanId))
        .limit(1);

      if (loan.length > 0) {
        const currentBalance = Number(loan[0].currentBalance);
        const newBalance = Math.max(0, currentBalance - validatedData.amountPaid);
        
        // Check if loan is fully paid off
        const isFullyPaid = newBalance <= 0.01;

        await db
          .update(loans)
          .set({
            currentBalance: newBalance.toString(),
            isActive: !isFullyPaid, // Mark as inactive if fully paid
            updatedAt: new Date(),
          })
          .where(eq(loans.id, validatedData.loanId));
      }
    }

    return NextResponse.json(newPayment[0], { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

