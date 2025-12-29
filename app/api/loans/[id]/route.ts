import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans } from '@/lib/db/schema';
import { updateLoanSchema } from '@/lib/validations/loan-schema';
import { eq } from 'drizzle-orm';

// GET /api/loans/[id] - Get single loan details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loanId = parseInt(id, 10);

    if (isNaN(loanId)) {
      return NextResponse.json(
        { error: 'Invalid loan ID' },
        { status: 400 }
      );
    }

    const loan = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);

    if (loan.length === 0) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(loan[0], { status: 200 });
  } catch (error) {
    console.error('Error fetching loan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan' },
      { status: 500 }
    );
  }
}

// PUT /api/loans/[id] - Update loan information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loanId = parseInt(id, 10);

    if (isNaN(loanId)) {
      return NextResponse.json(
        { error: 'Invalid loan ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateLoanSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validatedData.sourceType !== undefined)
      updateData.sourceType = validatedData.sourceType;
    if (validatedData.lenderName !== undefined)
      updateData.lenderName = validatedData.lenderName;
    if (validatedData.accountNumber !== undefined)
      updateData.accountNumber = validatedData.accountNumber;
    if (validatedData.principalAmount !== undefined)
      updateData.principalAmount = validatedData.principalAmount.toString();
    if (validatedData.currentBalance !== undefined)
      updateData.currentBalance = validatedData.currentBalance.toString();
    if (validatedData.interestRate !== undefined)
      updateData.interestRate = validatedData.interestRate.toString();
    if (validatedData.loanTermMonths !== undefined)
      updateData.loanTermMonths = validatedData.loanTermMonths;
    if (validatedData.startDate !== undefined)
      updateData.startDate = validatedData.startDate;
    if (validatedData.paymentFrequency !== undefined)
      updateData.paymentFrequency = validatedData.paymentFrequency;
    if (validatedData.minimumPayment !== undefined)
      updateData.minimumPayment = validatedData.minimumPayment.toString();
    if (validatedData.nextPaymentDueDate !== undefined)
      updateData.nextPaymentDueDate = validatedData.nextPaymentDueDate;
    if (validatedData.paymentStatus !== undefined)
      updateData.paymentStatus = validatedData.paymentStatus;
    if (validatedData.strategyType !== undefined)
      updateData.strategyType = validatedData.strategyType;
    if (validatedData.priorityOrder !== undefined)
      updateData.priorityOrder = validatedData.priorityOrder;
    if (validatedData.isActive !== undefined)
      updateData.isActive = validatedData.isActive;

    updateData.updatedAt = new Date();

    const updatedLoan = await db
      .update(loans)
      .set(updateData)
      .where(eq(loans.id, loanId))
      .returning();

    if (updatedLoan.length === 0) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedLoan[0], { status: 200 });
  } catch (error) {
    console.error('Error updating loan:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update loan' },
      { status: 500 }
    );
  }
}

// DELETE /api/loans/[id] - Mark loan as inactive
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loanId = parseInt(id, 10);

    if (isNaN(loanId)) {
      return NextResponse.json(
        { error: 'Invalid loan ID' },
        { status: 400 }
      );
    }

    const updatedLoan = await db
      .update(loans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(loans.id, loanId))
      .returning();

    if (updatedLoan.length === 0) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Loan marked as inactive', loan: updatedLoan[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json(
      { error: 'Failed to delete loan' },
      { status: 500 }
    );
  }
}

