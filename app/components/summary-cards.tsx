'use client';

import { useEffect, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateMonthlyObligation, calculateAvailableExtraFunds } from '@/lib/loan-calculations';
import type { Loan, MonthlyBudget } from '@/lib/db/schema';

interface SummaryData {
  totalDebt: number;
  monthlyObligation: number;
  monthlyBudget: number;
  availableExtraFunds: number;
  nextPaymentDue: string | null;
  overdueCount: number;
  totalInterest: number;
}

// Query functions
async function fetchLoans(): Promise<Loan[]> {
  const res = await fetch('/api/loans?is_active=true');
  if (!res.ok) throw new Error('Failed to fetch loans');
  return res.json();
}

async function fetchBudget(): Promise<MonthlyBudget | null> {
  const res = await fetch('/api/budget?active=true');
  if (!res.ok) return null;
  return res.json();
}

async function fetchOverduePayments(): Promise<unknown[]> {
  const res = await fetch('/api/payments?status=overdue');
  if (!res.ok) return [];
  return res.json();
}

export function SummaryCards() {
  const queryClient = useQueryClient();

  // Fetch all data in parallel with TanStack Query
  const queries = useQueries({
    queries: [
      {
        queryKey: ['loans', { isActive: true }],
        queryFn: fetchLoans,
        staleTime: 60 * 1000, // 1 minute
      },
      {
        queryKey: ['budget', { active: true }],
        queryFn: fetchBudget,
        staleTime: 60 * 1000, // 1 minute
      },
      {
        queryKey: ['payments', { status: 'overdue' }],
        queryFn: fetchOverduePayments,
        staleTime: 60 * 1000, // 1 minute
      },
    ],
  });

  const [loansQuery, budgetQuery, paymentsQuery] = queries;

  // Listen for budget updates and invalidate queries
  useEffect(() => {
    const handleBudgetUpdate = () => {
      // Invalidate budget queries (this will match ['budget', { active: true }] and all budget queries)
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      // Invalidate loan queries
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      // Invalidate all payment queries (this will match ['payments'], ['payments', { status: 'overdue' }], etc.)
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // Invalidate computed extra allocations (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['payments', 'extra-allocations'] });
      // Invalidate strategy queries (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['loans', 'strategy'] });
      // Invalidate all projection queries (this will match ['loans', 'projections', { strategyType }] for any strategyType)
      queryClient.invalidateQueries({ queryKey: ['loans', 'projections'] });
    };

    window.addEventListener('budget-updated', handleBudgetUpdate);

    return () => {
      window.removeEventListener('budget-updated', handleBudgetUpdate);
    };
  }, [queryClient]);

  // Compute summary data from query results
  const summary = useMemo<SummaryData>(() => {
    const loans = loansQuery.data ?? [];
    const budget = budgetQuery.data ?? null;
    const overduePayments = paymentsQuery.data ?? [];

    const totalDebt = loans.reduce(
      (sum, loan) => sum + Number(loan.currentBalance),
      0
    );
    const monthlyObligation = calculateMonthlyObligation(loans);
    const monthlyBudgetAmount = budget
      ? Number(budget.monthlyAllocation)
      : 0;
    const availableExtraFunds = calculateAvailableExtraFunds(
      monthlyBudgetAmount,
      loans
    );

    // Find next payment due
    const upcomingPayments = loans
      .map((loan) => ({
        date: loan.nextPaymentDueDate,
        status: loan.paymentStatus,
      }))
      .filter((p) => p.status !== 'overdue')
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    const nextPaymentDue =
      upcomingPayments.length > 0 ? upcomingPayments[0].date : null;

    // Calculate total interest (simplified - would need full calculation)
    const totalInterest = loans.reduce(
      (sum, loan) =>
        sum +
        (Number(loan.currentBalance) * Number(loan.interestRate)) / 100,
      0
    );

    return {
      totalDebt,
      monthlyObligation,
      monthlyBudget: monthlyBudgetAmount,
      availableExtraFunds,
      nextPaymentDue,
      overdueCount: overduePayments.length,
      totalInterest,
    };
  }, [loansQuery.data, budgetQuery.data, paymentsQuery.data]);

  const loading = loansQuery.isLoading || budgetQuery.isLoading || paymentsQuery.isLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Debt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalDebt)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Obligation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.monthlyObligation)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.monthlyBudget)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Available Extra Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.availableExtraFunds)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Next Payment Due
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.nextPaymentDue
              ? new Date(summary.nextPaymentDue).toLocaleDateString()
              : 'N/A'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.overdueCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Estimated Total Interest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalInterest)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

