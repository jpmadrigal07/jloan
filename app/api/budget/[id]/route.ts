import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monthlyBudget } from '@/lib/db/schema';
import { updateBudgetSchema } from '@/lib/validations/budget-schema';
import { eq } from 'drizzle-orm';

// GET /api/budget/[id] - Get specific budget entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budgetId = parseInt(id, 10);

    if (isNaN(budgetId)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      );
    }

    const budget = await db
      .select()
      .from(monthlyBudget)
      .where(eq(monthlyBudget.id, budgetId))
      .limit(1);

    if (budget.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(budget[0], { status: 200 });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

// PUT /api/budget/[id] - Update budget entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budgetId = parseInt(id, 10);

    if (isNaN(budgetId)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateBudgetSchema.parse(body);

    // If this budget is being set as active, deactivate all other budgets
    if (validatedData.isActive === true) {
      await db
        .update(monthlyBudget)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(monthlyBudget.isActive, true));
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.monthlyAllocation !== undefined)
      updateData.monthlyAllocation = validatedData.monthlyAllocation.toString();
    if (validatedData.effectiveDate !== undefined)
      updateData.effectiveDate = validatedData.effectiveDate;
    if (validatedData.isActive !== undefined)
      updateData.isActive = validatedData.isActive;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    updateData.updatedAt = new Date();

    const updatedBudget = await db
      .update(monthlyBudget)
      .set(updateData)
      .where(eq(monthlyBudget.id, budgetId))
      .returning();

    if (updatedBudget.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedBudget[0], { status: 200 });
  } catch (error) {
    console.error('Error updating budget:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}

// DELETE /api/budget/[id] - Deactivate budget entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budgetId = parseInt(id, 10);

    if (isNaN(budgetId)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      );
    }

    const updatedBudget = await db
      .update(monthlyBudget)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(monthlyBudget.id, budgetId))
      .returning();

    if (updatedBudget.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Budget deactivated successfully', budget: updatedBudget[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deactivating budget:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate budget' },
      { status: 500 }
    );
  }
}

