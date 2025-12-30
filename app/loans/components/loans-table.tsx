'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Query function
async function fetchLoans(): Promise<Loan[]> {
  const response = await fetch('/api/loans?is_active=true');
  if (!response.ok) throw new Error('Failed to fetch loans');
  return response.json();
}

// Mutation function
async function deleteLoan(loanId: number): Promise<void> {
  const response = await fetch(`/api/loans/${loanId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete loan');
}

export function LoansTable() {
  const queryClient = useQueryClient();
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Fetch loans with TanStack Query
  const { data: loans = [], isLoading: loading } = useQuery({
    queryKey: ['loans', { isActive: true }],
    queryFn: fetchLoans,
    staleTime: 60 * 1000, // 1 minute
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      // Invalidate and refetch loans (this will match ['loans', { isActive: true }] and all loan queries)
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      // Invalidate budget queries (for summary cards)
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      // Invalidate all payment queries (this will match ['payments'], ['payments', { status: 'overdue' }], etc.)
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // Invalidate computed extra allocations (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['payments', 'extra-allocations'] });
      // Invalidate strategy queries (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['loans', 'strategy'] });
      // Invalidate all projection queries (this will match ['loans', 'projections', { strategyType }] for any strategyType)
      queryClient.invalidateQueries({ queryKey: ['loans', 'projections'] });
    },
  });

  async function handleDelete(loanId: number) {
    if (!confirm('Are you sure you want to delete this loan?')) {
      return;
    }
    deleteMutation.mutate(loanId);
  }

  function handleEdit(loan: Loan) {
    setEditingLoan(loan);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingLoan(null);
    // Queries will be invalidated by the mutation in LoanForm
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
