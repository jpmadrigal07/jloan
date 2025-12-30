'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import type { Loan, MonthlyBudget } from '@/lib/db/schema';
import { calculateStrategyProjections } from '@/lib/loan-calculations';

interface Payment {
  payment: {
    id: number;
    loanId: number;
    dueDate: string;
    amountDue: number | string;
    amountPaid: number | string | null;
    status: string;
    paidDate: string | null;
  };
  loan: {
    id: number;
    lenderName: string;
    sourceType: string;
    minimumPayment?: number | string;
  };
}

interface PaymentModalData {
  paymentId: number;
  loanId: number;
  lenderName: string;
  minimumPayment: number;
  extraAllocation: number;
}

// Query functions
async function fetchPayments(): Promise<Payment[]> {
  const response = await fetch('/api/payments');
  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }
  return response.json();
}

async function fetchExtraPaymentAllocations(): Promise<Record<number, number>> {
  // Fetch loans, budget, and strategy
  const [loansRes, budgetRes] = await Promise.all([
    fetch('/api/loans?is_active=true'),
    fetch('/api/budget?active=true'),
  ]);

  if (!loansRes.ok) {
    throw new Error('Failed to fetch loans');
  }

  const loans: Loan[] = await loansRes.json();
  const budget: MonthlyBudget | null = budgetRes.ok
    ? await budgetRes.json()
    : null;

  // Get strategy type from first loan (assuming all loans have same strategy)
  const strategyType =
    loans.length > 0 && loans[0].strategyType
      ? (loans[0].strategyType as 'snowball' | 'avalanche' | 'custom')
      : null;

  // Calculate extra payment allocations
  const projections = calculateStrategyProjections(
    loans,
    budget,
    strategyType
  );

  return projections.extraPaymentAllocations;
}

export function PaymentsOverview() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<PaymentModalData | null>(null);

  // Fetch payments with TanStack Query
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    error: paymentsError,
  } = useQuery({
    queryKey: ['payments'],
    queryFn: fetchPayments,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch extra payment allocations with TanStack Query
  const {
    data: extraPaymentAllocations = {},
    isLoading: allocationsLoading,
    error: allocationsError,
  } = useQuery({
    queryKey: ['payments', 'extra-allocations'],
    queryFn: fetchExtraPaymentAllocations,
    staleTime: 60 * 1000, // 1 minute
  });

  const loading = paymentsLoading || allocationsLoading;

  function handleMarkPaidClick(
    paymentId: number,
    loanId: number,
    lenderName: string,
    minimumPayment: number | string
  ) {
    const minPayment = Number(minimumPayment);
    const extraAllocation = extraPaymentAllocations[loanId] || 0;

    // If no extra allocation, record minimum payment directly
    if (extraAllocation <= 0.001) {
      handleMarkPaid(paymentId, minPayment);
      return;
    }

    // Show modal for confirmation
    setModalData({
      paymentId,
      loanId,
      lenderName,
      minimumPayment: minPayment,
      extraAllocation,
    });
    setModalOpen(true);
  }

  // Mutation for marking payment as paid
  const markPaidMutation = useMutation({
    mutationFn: async ({
      paymentId,
      amountPaid,
    }: {
      paymentId: number;
      amountPaid: number;
    }) => {
      // Validate the amount
      if (isNaN(amountPaid) || amountPaid <= 0) {
        throw new Error('Invalid payment amount. Please try again.');
      }

      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'paid',
          amountPaid: amountPaid,
          paidDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Failed to mark payment as paid. Please try again.'
        );
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all payment queries (this will match ['payments'], ['payments', { status: 'overdue' }], etc.)
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // Invalidate computed extra allocations (depends on loans and budget, may have changed due to balance update)
      queryClient.invalidateQueries({ queryKey: ['payments', 'extra-allocations'] });
      // Invalidate loan queries (loan balance was updated when payment was marked as paid)
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      // Invalidate budget queries (for summary cards)
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      // Invalidate strategy queries (depends on loans, may have changed due to balance update)
      queryClient.invalidateQueries({ queryKey: ['loans', 'strategy'] });
      // Invalidate all projection queries (this will match ['loans', 'projections', { strategyType }] for any strategyType)
      queryClient.invalidateQueries({ queryKey: ['loans', 'projections'] });
    },
    onError: (error: Error) => {
      console.error('Error marking payment as paid:', error);
      alert(error.message || 'Failed to mark payment as paid. Please try again.');
    },
  });

  async function handleMarkPaid(paymentId: number, amountPaid: number) {
    markPaidMutation.mutate({ paymentId, amountPaid });
  }

  function handleModalConfirm(includeExtra: boolean) {
    if (!modalData) return;

    const amountPaid = includeExtra
      ? modalData.minimumPayment + modalData.extraAllocation
      : modalData.minimumPayment;

    handleMarkPaid(modalData.paymentId, amountPaid);
    setModalOpen(false);
    setModalData(null);
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'overdue':
        return 'text-red-600';
      case 'missed':
        return 'text-red-800';
      default:
        return 'text-yellow-600';
    }
  };

  const upcomingPayments = payments
    .filter((p) => p.payment.status === 'pending' || p.payment.status === 'upcoming')
    .sort((a, b) => (a.payment.dueDate > b.payment.dueDate ? 1 : -1));

  const overduePayments = payments.filter(
    (p) => p.payment.status === 'overdue'
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (paymentsError || allocationsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            {paymentsError instanceof Error
              ? paymentsError.message
              : allocationsError instanceof Error
                ? allocationsError.message
                : 'Failed to load payments. Please try again.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {overduePayments.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Overdue Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Extra Payment Allocation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePayments.map((item) => {
                  const extraAllocation = extraPaymentAllocations[item.loan.id] || 0;
                  const minimumPayment = Number(item.loan.minimumPayment || item.payment.amountDue);
                  return (
                    <TableRow key={item.payment.id}>
                      <TableCell className="font-medium">
                        {item.loan.lenderName}
                      </TableCell>
                      <TableCell>
                        {new Date(item.payment.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.payment.amountDue)}
                      </TableCell>
                      <TableCell>
                        {extraAllocation > 0.001 ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(extraAllocation)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={getStatusColor(item.payment.status)}>
                          {item.payment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleMarkPaidClick(
                              item.payment.id,
                              item.loan.id,
                              item.loan.lenderName,
                              minimumPayment
                            )
                          }
                          disabled={markPaidMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {markPaidMutation.isPending ? 'Processing...' : 'Mark Paid'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming payments found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Extra Payment Allocation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPayments.map((item) => {
                  const extraAllocation = extraPaymentAllocations[item.loan.id] || 0;
                  const minimumPayment = Number(item.loan.minimumPayment || item.payment.amountDue);
                  return (
                    <TableRow key={item.payment.id}>
                      <TableCell className="font-medium">
                        {item.loan.lenderName}
                      </TableCell>
                      <TableCell>
                        {new Date(item.payment.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.payment.amountDue)}
                      </TableCell>
                      <TableCell>
                        {extraAllocation > 0.001 ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(extraAllocation)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={getStatusColor(item.payment.status)}>
                          {item.payment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleMarkPaidClick(
                              item.payment.id,
                              item.loan.id,
                              item.loan.lenderName,
                              minimumPayment
                            )
                          }
                          disabled={markPaidMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {markPaidMutation.isPending ? 'Processing...' : 'Mark Paid'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Please confirm whether you have included the extra allocated payment.
            </DialogDescription>
          </DialogHeader>
          {modalData && (
            <div className="space-y-4 py-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Lender</div>
                <div className="font-medium">{modalData.lenderName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Minimum Payment
                </div>
                <div className="font-medium">
                  {formatCurrency(modalData.minimumPayment)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Extra Payment Allocation
                </div>
                <div className="font-medium text-green-600">
                  {formatCurrency(modalData.extraAllocation)}
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground mb-1">
                  Total (if including extra)
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(
                    modalData.minimumPayment + modalData.extraAllocation
                  )}
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm font-medium">
                  Have you included the extra allocated payment?
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleModalConfirm(false)}
              className="w-full sm:w-auto"
              disabled={markPaidMutation.isPending}
            >
              No (Minimum Only)
            </Button>
            <Button
              onClick={() => handleModalConfirm(true)}
              className="w-full sm:w-auto"
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? 'Processing...' : 'Yes (Minimum + Extra)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

