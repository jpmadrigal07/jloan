'use client';

import { useEffect, useState } from 'react';
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

export function PaymentsOverview() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [extraPaymentAllocations, setExtraPaymentAllocations] = useState<
    Record<number, number>
  >({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<PaymentModalData | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchExtraPaymentAllocations();
  }, []);

  async function fetchPayments() {
    try {
      const response = await fetch('/api/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExtraPaymentAllocations() {
    try {
      // Fetch loans, budget, and strategy
      const [loansRes, budgetRes] = await Promise.all([
        fetch('/api/loans?is_active=true'),
        fetch('/api/budget?active=true'),
      ]);

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

      setExtraPaymentAllocations(projections.extraPaymentAllocations);
    } catch (error) {
      console.error('Error fetching extra payment allocations:', error);
    }
  }

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

  async function handleMarkPaid(paymentId: number, amountPaid: number) {
    try {
      // Validate the amount
      if (isNaN(amountPaid) || amountPaid <= 0) {
        alert('Invalid payment amount. Please try again.');
        return;
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

      if (response.ok) {
        fetchPayments();
        fetchExtraPaymentAllocations();
        // Refresh loans to update balances
        window.location.reload();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error marking payment as paid:', errorData);
        alert(
          errorData.error || 'Failed to mark payment as paid. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Failed to mark payment as paid. Please try again.');
    }
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
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Paid
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
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Paid
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
            >
              No (Minimum Only)
            </Button>
            <Button
              onClick={() => handleModalConfirm(true)}
              className="w-full sm:w-auto"
            >
              Yes (Minimum + Extra)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

