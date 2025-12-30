import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monthlyBudget } from '@/lib/db/schema';
import { createBudgetSchema } from '@/lib/validations/budget-schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';

// GET /api/budget - Get current active monthly budget
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      const activeBudget = await db
        .select()
        .from(monthlyBudget)
        .where(eq(monthlyBudget.isActive, true))
        .limit(1);

      if (activeBudget.length === 0) {
        return NextResponse.json(
          { error: 'No active budget found' },
          { status: 404 }
        );
      }

      return NextResponse.json(activeBudget[0], { status: 200 });
    }

    // Get all budgets, ordered by created date (newest first)
    const allBudgets = await db
      .select()
      .from(monthlyBudget)
      .orderBy(desc(monthlyBudget.createdAt));

    return NextResponse.json(allBudgets, { status: 200 });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

// POST /api/budget - Create new monthly budget entry
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = createBudgetSchema.parse(body);

    // If this budget is being set as active, deactivate all other budgets
    if (validatedData.isActive) {
      await db
        .update(monthlyBudget)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(monthlyBudget.isActive, true));
    }

    const newBudget = await db
      .insert(monthlyBudget)
      .values({
        monthlyAllocation: validatedData.monthlyAllocation,
        effectiveDate: validatedData.effectiveDate,
        isActive: validatedData.isActive ?? false,
        notes: validatedData.notes ?? null,
      })
      .returning();

    return NextResponse.json(newBudget[0], { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}
