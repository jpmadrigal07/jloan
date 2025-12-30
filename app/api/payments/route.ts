import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upcomingPayments, loans } from '@/lib/db/schema';
import { createPaymentSchema } from '@/lib/validations/payment-schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';

// GET /api/payments - Get upcoming payments (with loan details)
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const hasPageParam = searchParams.has('page');
    const hasLimitParam = searchParams.has('limit');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build base query conditions
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

    // Get total count for pagination (count from payments table with same conditions)
    const countQueryBuilder = db
      .select({ count: count() })
      .from(upcomingPayments);

    const countQuery = conditions.length > 0
      ? countQueryBuilder.where(and(...conditions))
      : countQueryBuilder;

    // Build data query base
    const dataQueryBase = db
      .select({
        payment: upcomingPayments,
        loan: loans,
      })
      .from(upcomingPayments)
      .innerJoin(loans, eq(upcomingPayments.loanId, loans.id));

    // Apply where conditions
    const dataQueryWithWhere = conditions.length > 0
      ? dataQueryBase.where(and(...conditions))
      : dataQueryBase;

    // Apply ordering
    const dataQueryWithOrder = status === 'paid'
      ? dataQueryWithWhere.orderBy(desc(upcomingPayments.paidDate))
      : dataQueryWithWhere.orderBy(upcomingPayments.dueDate);

    // Apply pagination if page and limit parameters are explicitly provided
    const dataQuery = (hasPageParam && hasLimitParam && page > 0 && limit > 0)
      ? dataQueryWithOrder.limit(limit).offset((page - 1) * limit)
      : dataQueryWithOrder;

    // Execute queries
    const [totalResult, payments] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = hasLimitParam && limit > 0 ? Math.ceil(total / limit) : 1;

    // If pagination parameters are explicitly provided, return paginated response
    // Otherwise, return array format for backward compatibility
    if (hasPageParam && hasLimitParam) {
      return NextResponse.json(
        {
          data: payments,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        { status: 200 }
      );
    }

    // Backward compatibility: return array format
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
    await requireAuth(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    const newPayment = await db
      .insert(upcomingPayments)
      .values({
        loanId: validatedData.loanId,
        dueDate: validatedData.dueDate,
        amountDue: validatedData.amountDue,
        amountPaid: validatedData.amountPaid ?? null,
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
            currentBalance: newBalance,
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
