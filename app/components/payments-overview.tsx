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
import { Check } from 'lucide-react';

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
  };
}

export function PaymentsOverview() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
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

  async function handleMarkPaid(paymentId: number, loanId: number, amountDue: number | string) {
    try {
      // Ensure amountDue is converted to a number
      const amountPaid = typeof amountDue === 'string' ? parseFloat(amountDue) : amountDue;
      
      // Validate the converted amount
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePayments.map((item) => (
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
                      <span className={getStatusColor(item.payment.status)}>
                        {item.payment.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleMarkPaid(
                            item.payment.id,
                            item.loan.id,
                            item.payment.amountDue
                          )
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPayments.map((item) => (
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
                      <span className={getStatusColor(item.payment.status)}>
                        {item.payment.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleMarkPaid(
                            item.payment.id,
                            item.loan.id,
                            item.payment.amountDue
                          )
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

