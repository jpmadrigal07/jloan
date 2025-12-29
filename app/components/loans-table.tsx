'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Loan } from '@/lib/db/schema';
import { LoanForm } from './loan-form';
import { Edit, Trash2 } from 'lucide-react';

export function LoansTable() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    try {
      const response = await fetch('/api/loans?is_active=true');
      const data = await response.json();
      setLoans(data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(loanId: number) {
    if (!confirm('Are you sure you want to delete this loan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLoans();
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
  }

  function handleEdit(loan: Loan) {
    setEditingLoan(loan);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingLoan(null);
    fetchLoans();
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
      case 'overdue':
        return 'text-red-600';
      case 'upcoming':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Loans</CardTitle>
            <Button onClick={() => setShowForm(true)}>Add Loan</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No loans found. Add your first loan to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lender</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Interest Rate</TableHead>
                  <TableHead>Min Payment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      {loan.lenderName}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {loan.sourceType.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(loan.currentBalance)}
                    </TableCell>
                    <TableCell>{Number(loan.interestRate).toFixed(2)}%</TableCell>
                    <TableCell>
                      {formatCurrency(loan.minimumPayment)}
                    </TableCell>
                    <TableCell>
                      {new Date(loan.nextPaymentDueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={getStatusColor(loan.paymentStatus)}>
                        {loan.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(loan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(loan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LoanForm
        loan={editingLoan}
        open={showForm}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false);
          setEditingLoan(null);
        }}
      />
    </>
  );
}
