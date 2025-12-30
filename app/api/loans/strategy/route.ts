import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans, monthlyBudget } from '@/lib/db/schema';
import { applyStrategy } from '@/lib/strategy-helpers';
import { calculateStrategyProjections } from '@/lib/loan-calculations';
import { eq } from 'drizzle-orm';

// GET /api/loans/strategy - Get loans ordered by current strategy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const strategyType = searchParams.get('strategy_type') as
      | 'snowball'
      | 'avalanche'
      | 'custom'
      | null;

    const allLoans = await db.select().from(loans).where(eq(loans.isActive, true));
    
    // Determine the current strategy type from loans (use query param if provided, otherwise infer from loans)
    let currentStrategyType = strategyType;
    if (currentStrategyType === null && allLoans.length > 0) {
      // Get strategy type from first loan (assuming all loans have same strategy)
      currentStrategyType = allLoans[0].strategyType;
    }
    
    const sortedLoans = applyStrategy(allLoans, currentStrategyType);

    // Get active budget
    const activeBudget = await db
      .select()
      .from(monthlyBudget)
      .where(eq(monthlyBudget.isActive, true))
      .limit(1);

    const budget = activeBudget.length > 0 ? activeBudget[0] : null;

    // Calculate projections
    const projections = calculateStrategyProjections(
      allLoans,
      budget,
      currentStrategyType
    );

    return NextResponse.json(
      {
        loans: sortedLoans,
        strategyType: currentStrategyType,
        projections,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy' },
      { status: 500 }
    );
  }
}

// POST /api/loans/strategy - Update strategy type and priorities
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategyType, priorities } = body;

    // Allow null for "No Strategy" option, or validate it's one of the valid types
    if (
      strategyType !== null &&
      !['snowball', 'avalanche', 'custom'].includes(strategyType)
    ) {
      return NextResponse.json(
        { error: 'Invalid strategy type' },
        { status: 400 }
      );
    }

    // Update all active loans with the new strategy type (can be null)
    await db
      .update(loans)
      .set({
        strategyType: strategyType as 'snowball' | 'avalanche' | 'custom' | null,
        updatedAt: new Date(),
      })
      .where(eq(loans.isActive, true));

    // If custom strategy, update priority orders
    if (strategyType === 'custom' && priorities && Array.isArray(priorities)) {
      for (const priority of priorities) {
        if (priority.loanId && priority.order !== undefined) {
          await db
            .update(loans)
            .set({
              priorityOrder: priority.order,
              updatedAt: new Date(),
            })
            .where(eq(loans.id, priority.loanId));
        }
      }
    }

    // Get updated loans and calculate projections
    const allLoans = await db.select().from(loans).where(eq(loans.isActive, true));
    const activeBudget = await db
      .select()
      .from(monthlyBudget)
      .where(eq(monthlyBudget.isActive, true))
      .limit(1);

    const budget = activeBudget.length > 0 ? activeBudget[0] : null;
    const projections = calculateStrategyProjections(
      allLoans,
      budget,
      strategyType
    );

    return NextResponse.json(
      {
        message: 'Strategy updated successfully',
        strategyType,
        projections,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to update strategy' },
      { status: 500 }
    );
  }
}

