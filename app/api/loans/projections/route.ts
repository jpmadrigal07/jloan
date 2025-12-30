import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans, monthlyBudget } from '@/lib/db/schema';
import { calculateStrategyProjections, calculateMonthlyObligation } from '@/lib/loan-calculations';
import { eq } from 'drizzle-orm';
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/loans/projections - Calculate payoff projections
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    let strategyType = searchParams.get('strategy_type') as
      | 'snowball'
      | 'avalanche'
      | 'custom'
      | null;

    const allLoans = await db.select().from(loans).where(eq(loans.isActive, true));

    // If no strategy type provided in query, try to get it from loans
    if (!strategyType && allLoans.length > 0) {
      // Get strategy type from first loan (all loans should have the same strategy)
      const firstLoanStrategy = allLoans[0].strategyType;
      if (firstLoanStrategy) {
        strategyType = firstLoanStrategy as 'snowball' | 'avalanche' | 'custom';
      }
    }

    // Get active budget
    const activeBudget = await db
      .select()
      .from(monthlyBudget)
      .where(eq(monthlyBudget.isActive, true))
      .limit(1);

    const budget = activeBudget.length > 0 ? activeBudget[0] : null;
    
    // Debug logging
    if (budget) {
      console.log('Projections API - Budget found:', {
        monthlyAllocation: budget.monthlyAllocation,
        effectiveDate: budget.effectiveDate,
      });
    } else {
      console.log('Projections API - No active budget found');
    }

    // Calculate minimum payment scenario
    const monthlyObligation = calculateMonthlyObligation(allLoans);
    const minProjections = calculateStrategyProjections(allLoans, budget, null);

    // Calculate strategy scenario
    const strategyProjections = calculateStrategyProjections(
      allLoans,
      budget,
      strategyType
    );

    return NextResponse.json(
      {
        minimumPayment: {
          monthlyObligation,
          projections: minProjections,
        },
        strategy: {
          strategyType: strategyType || null,
          projections: strategyProjections,
        },
        comparison: {
          interestSavings: minProjections.totalInterest - strategyProjections.totalInterest,
          timeSavings: minProjections.totalMonths - strategyProjections.totalMonths,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error calculating projections:', error);
    return NextResponse.json(
      { error: 'Failed to calculate projections' },
      { status: 500 }
    );
  }
}

