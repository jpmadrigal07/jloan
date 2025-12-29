'use client';

import { useEffect, useState } from 'react';
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

export function SummaryCards() {
  const [summary, setSummary] = useState<SummaryData>({
    totalDebt: 0,
    monthlyObligation: 0,
    monthlyBudget: 0,
    availableExtraFunds: 0,
    nextPaymentDue: null,
    overdueCount: 0,
    totalInterest: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const [loansRes, budgetRes, paymentsRes] = await Promise.all([
          fetch('/api/loans?is_active=true'),
          fetch('/api/budget?active=true'),
          fetch('/api/payments?status=overdue'),
        ]);

        const loans: Loan[] = await loansRes.json();
        const budget: MonthlyBudget | null = budgetRes.ok
          ? await budgetRes.json()
          : null;
        const overduePayments = paymentsRes.ok ? await paymentsRes.json() : [];

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

        setSummary({
          totalDebt,
          monthlyObligation,
          monthlyBudget: monthlyBudgetAmount,
          availableExtraFunds,
          nextPaymentDue,
          overdueCount: overduePayments.length,
          totalInterest,
        });
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();

    // Listen for budget updates
    const handleBudgetUpdate = () => {
      fetchSummary();
    };

    window.addEventListener('budget-updated', handleBudgetUpdate);

    return () => {
      window.removeEventListener('budget-updated', handleBudgetUpdate);
    };
  }, []);

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

