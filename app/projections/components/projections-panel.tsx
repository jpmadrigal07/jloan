'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { StrategyProjection } from '@/lib/loan-calculations';

interface ProjectionsData {
  minimumPayment: {
    monthlyObligation: number;
    projections: StrategyProjection;
  };
  strategy: {
    strategyType: string | null;
    projections: StrategyProjection;
  };
  comparison: {
    interestSavings: number;
    timeSavings: number;
  };
}

interface StrategyResponse {
  loans: any[];
  strategyType: string | null;
  projections: StrategyProjection;
}

// Query function to fetch strategy and loans
async function fetchStrategy(): Promise<StrategyResponse> {
  const response = await fetch('/api/loans/strategy');
  if (!response.ok) {
    throw new Error('Failed to fetch strategy');
  }
  return response.json();
}

// Query function to fetch projections
async function fetchProjections(strategyType: string | null): Promise<ProjectionsData> {
  const url = strategyType
    ? `/api/loans/projections?strategy_type=${strategyType}`
    : '/api/loans/projections';
  
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch projections');
  }
  
  return response.json();
}

export function ProjectionsPanel() {
  const queryClient = useQueryClient();

  // Fetch strategy and loans
  const {
    data: strategyData,
    isLoading: strategyLoading,
    error: strategyError,
  } = useQuery({
    queryKey: ['loans', 'strategy'],
    queryFn: fetchStrategy,
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract strategy type from strategy data
  const strategyType = strategyData?.strategyType ?? null;
  const loans = strategyData?.loans ?? [];

  // Fetch projections based on strategy type
  const {
    data: projections,
    isLoading: projectionsLoading,
    error: projectionsError,
  } = useQuery({
    queryKey: ['loans', 'projections', { strategyType }],
    queryFn: () => fetchProjections(strategyType),
    enabled: strategyData !== undefined, // Only fetch when strategy is loaded
    staleTime: 60 * 1000, // 1 minute
  });

  // Listen for budget updates and invalidate queries
  useEffect(() => {
    const handleBudgetUpdate = () => {
      console.log('Budget updated event received, invalidating queries...');
      // Invalidate budget queries (this will match ['budget', { active: true }] and all budget queries)
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      // Invalidate loan queries (for consistency, as strategy/projections depend on loans)
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      // Invalidate strategy queries (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['loans', 'strategy'] });
      // Invalidate all projection queries (this will match ['loans', 'projections', { strategyType }] for any strategyType)
      queryClient.invalidateQueries({ queryKey: ['loans', 'projections'] });
      // Invalidate computed extra allocations (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['payments', 'extra-allocations'] });
    };

    window.addEventListener('budget-updated', handleBudgetUpdate);

    return () => {
      window.removeEventListener('budget-updated', handleBudgetUpdate);
    };
  }, [queryClient]);

  const loading = strategyLoading || projectionsLoading;
  const error = strategyError || projectionsError;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0 && remainingMonths > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else {
      return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payoff Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payoff Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Error loading projections. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projections) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payoff Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No projections available. Add loans and set a budget to see
            projections.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payoff Projections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <div className="text-sm text-muted-foreground mb-2">
              Minimum Payment Scenario
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold">
                {formatMonths(projections.minimumPayment.projections.totalMonths)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Interest: {formatCurrency(projections.minimumPayment.projections.totalInterest)}
              </div>
            </div>
          </div>

          <div className="p-4 border rounded bg-primary/5">
            <div className="text-sm text-muted-foreground mb-2">
              Strategy Scenario
              {projections.strategy.strategyType && (
                <span className="ml-2 capitalize">
                  ({projections.strategy.strategyType.replace('_', ' ')})
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-lg font-semibold">
                {formatMonths(projections.strategy.projections.totalMonths)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Interest: {formatCurrency(projections.strategy.projections.totalInterest)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-900 mb-2">
            Strategy Benefits
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-green-700">Interest Savings</div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(projections.comparison.interestSavings)}
              </div>
            </div>
            <div>
              <div className="text-sm text-green-700">Time Savings</div>
              <div className="text-xl font-bold text-green-900">
                {formatMonths(projections.comparison.timeSavings)}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">
            Extra Payment Allocations
          </div>
          {Object.keys(projections.strategy.projections.extraPaymentAllocations)
            .length > 0 ? (
            <div className="space-y-2">
              {Object.entries(
                projections.strategy.projections.extraPaymentAllocations
              ).map(([loanId, amount]) => {
                const loan = loans.find((l) => l.id === Number(loanId));
                const lenderName = loan?.lenderName || `Loan #${loanId}`;
                return (
                  <div
                    key={loanId}
                    className="flex justify-between text-sm p-2 bg-muted rounded"
                  >
                    <span>{lenderName}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              No extra payments allocated. Select a payment strategy and ensure
              your monthly budget exceeds minimum payments to see extra payment
              allocations.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

