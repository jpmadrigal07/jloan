import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upcomingPayments, loans } from '@/lib/db/schema';
import { updatePaymentSchema } from '@/lib/validations/payment-schema';
import { eq } from 'drizzle-orm';

// PUT /api/payments/[id] - Update payment status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePaymentSchema.parse(body);

    // Get current payment to check if we need to update loan balance
    const currentPayment = await db
      .select()
      .from(upcomingPayments)
      .where(eq(upcomingPayments.id, paymentId))
      .limit(1);

    if (currentPayment.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.amountPaid !== undefined && validatedData.amountPaid !== null)
      updateData.amountPaid = validatedData.amountPaid;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.paidDate !== undefined)
      updateData.paidDate = validatedData.paidDate;
    updateData.updatedAt = new Date();

    const updatedPayment = await db
      .update(upcomingPayments)
      .set(updateData)
      .where(eq(upcomingPayments.id, paymentId))
      .returning();

    // If payment status changed to paid, update loan balance
    if (
      validatedData.status === 'paid' &&
      validatedData.amountPaid &&
      currentPayment[0].status !== 'paid'
    ) {
      const loan = await db
        .select()
        .from(loans)
        .where(eq(loans.id, currentPayment[0].loanId))
        .limit(1);

      if (loan.length > 0) {
        const currentBalance = Number(loan[0].currentBalance);
        const newBalance = Math.max(0, currentBalance - validatedData.amountPaid);

        // Check if loan is fully paid off
        const isFullyPaid = newBalance <= 0.01;

        await db
          .update(loans)
          .set({
            currentBalance: newBalance,
            isActive: !isFullyPaid, // Mark as inactive if fully paid
            updatedAt: new Date(),
          })
          .where(eq(loans.id, currentPayment[0].loanId));
      }
    }

    return NextResponse.json(updatedPayment[0], { status: 200 });
  } catch (error) {
    console.error('Error updating payment:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id] - Remove payment record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    const deletedPayment = await db
      .delete(upcomingPayments)
      .where(eq(upcomingPayments.id, paymentId))
      .returning();

    if (deletedPayment.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Payment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}
