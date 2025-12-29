'use client';

import { useEffect, useState } from 'react';
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

export function ProjectionsPanel() {
  const [projections, setProjections] = useState<ProjectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [strategyType, setStrategyType] = useState<string | null>(null);
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    fetchStrategyAndProjections();

    // Listen for budget updates
    const handleBudgetUpdate = () => {
      console.log('Budget updated event received, refreshing projections...');
      setLoading(true);
      fetchStrategyAndProjections();
    };

    window.addEventListener('budget-updated', handleBudgetUpdate);

    return () => {
      window.removeEventListener('budget-updated', handleBudgetUpdate);
    };
  }, []);

  async function fetchStrategyAndProjections() {
    try {
      // First, get the current strategy
      const strategyResponse = await fetch('/api/loans/strategy');
      let currentStrategy: string | null = null;
      
      if (strategyResponse.ok) {
        const strategyData = await strategyResponse.json();
        // Store loans for lender name lookup
        if (strategyData.loans && strategyData.loans.length > 0) {
          setLoans(strategyData.loans);
        }
        // Get strategy from API response or from first loan
        if (strategyData.strategyType !== undefined && strategyData.strategyType !== null) {
          currentStrategy = strategyData.strategyType;
        } else if (strategyData.loans && strategyData.loans.length > 0) {
          // Check all loans for a strategy type (they should all have the same one)
          const loanWithStrategy = strategyData.loans.find((loan: any) => loan.strategyType);
          if (loanWithStrategy) {
            currentStrategy = loanWithStrategy.strategyType;
          }
        }
      }
      
      setStrategyType(currentStrategy);

      // Then fetch projections with the strategy type
      // Always pass strategy_type parameter, even if null
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const projectionsUrl = `/api/loans/projections${currentStrategy ? `?strategy_type=${currentStrategy}&_t=${timestamp}` : `?_t=${timestamp}`}`;
      
      const response = await fetch(projectionsUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Projections fetched:', {
          strategyType: data.strategy?.strategyType,
          totalMonths: data.strategy?.projections?.totalMonths,
          totalInterest: data.strategy?.projections?.totalInterest,
        });
        setProjections(data);
      } else {
        console.error('Failed to fetch projections:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching projections:', error);
    } finally {
      setLoading(false);
    }
  }

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

