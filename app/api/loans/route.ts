import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans } from '@/lib/db/schema';
import { createLoanSchema } from '@/lib/validations/loan-schema';
import { eq, and } from 'drizzle-orm';

// GET /api/loans - Get all loans with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('source_type');
    const status = searchParams.get('status');
    const isActive = searchParams.get('is_active');

    const conditions = [];
    if (sourceType) {
      conditions.push(eq(loans.sourceType, sourceType as 'bank' | 'mobile_app' | 'person'));
    }
    if (status) {
      conditions.push(eq(loans.paymentStatus, status as 'current' | 'upcoming' | 'overdue'));
    }
    if (isActive !== null) {
      conditions.push(eq(loans.isActive, isActive === 'true'));
    }

    const query = conditions.length > 0
      ? db.select().from(loans).where(and(...conditions))
      : db.select().from(loans);

    const allLoans = await query;
    return NextResponse.json(allLoans, { status: 200 });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

// POST /api/loans - Create a new loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createLoanSchema.parse(body);

    const newLoan = await db
      .insert(loans)
      .values({
        sourceType: validatedData.sourceType,
        lenderName: validatedData.lenderName,
        accountNumber: validatedData.accountNumber ?? null,
        principalAmount: validatedData.principalAmount,
        currentBalance: validatedData.currentBalance,
        interestRate: validatedData.interestRate,
        loanTermMonths: validatedData.loanTermMonths,
        startDate: validatedData.startDate,
        paymentFrequency: validatedData.paymentFrequency,
        minimumPayment: validatedData.minimumPayment,
        nextPaymentDueDate: validatedData.nextPaymentDueDate,
        paymentStatus: validatedData.paymentStatus,
        strategyType: validatedData.strategyType ?? null,
        priorityOrder: validatedData.priorityOrder ?? null,
        isActive: validatedData.isActive ?? true,
      })
      .returning();

    return NextResponse.json(newLoan[0], { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create loan' },
      { status: 500 }
    );
  }
}
