'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLoanSchema, type LoanInput } from '@/lib/validations/loan-schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Loan } from '@/lib/db/schema';

interface LoanFormProps {
  loan?: Loan | null;
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LoanForm({ loan, open, onSuccess, onCancel }: LoanFormProps) {
  const form = useForm<LoanInput>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: loan
      ? {
        sourceType: loan.sourceType,
        lenderName: loan.lenderName,
        accountNumber: loan.accountNumber ?? undefined,
        principalAmount: Number(loan.principalAmount),
        currentBalance: Number(loan.currentBalance),
        interestRate: Number(loan.interestRate),
        loanTermMonths: loan.loanTermMonths,
        startDate: loan.startDate,
        paymentFrequency: loan.paymentFrequency,
        minimumPayment: Number(loan.minimumPayment),
        nextPaymentDueDate: loan.nextPaymentDueDate,
        paymentStatus: loan.paymentStatus,
        strategyType: loan.strategyType ?? undefined,
        priorityOrder: loan.priorityOrder ?? undefined,
        isActive: loan.isActive,
      }
      : {
        sourceType: 'bank',
        paymentFrequency: 'monthly',
        paymentStatus: 'current',
        isActive: true,
      },
  });

  useEffect(() => {
    if (loan) {
      form.reset({
        sourceType: loan.sourceType,
        lenderName: loan.lenderName,
        accountNumber: loan.accountNumber ?? undefined,
        principalAmount: Number(loan.principalAmount),
        currentBalance: Number(loan.currentBalance),
        interestRate: Number(loan.interestRate),
        loanTermMonths: loan.loanTermMonths,
        startDate: loan.startDate,
        paymentFrequency: loan.paymentFrequency,
        minimumPayment: Number(loan.minimumPayment),
        nextPaymentDueDate: loan.nextPaymentDueDate,
        paymentStatus: loan.paymentStatus,
        strategyType: loan.strategyType ?? undefined,
        priorityOrder: loan.priorityOrder ?? undefined,
        isActive: loan.isActive,
      });
    }
  }, [loan, form]);

  const queryClient = useQueryClient();

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: LoanInput) => {
      const url = loan ? `/api/loans/${loan.id}` : '/api/loans';
      const method = loan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save loan');
      }

      return response.json();
    },
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
      onSuccess();
    },
    onError: (error: Error) => {
      console.error('Error saving loan:', error);
      alert(error.message || 'Failed to save loan. Please try again.');
    },
  });

  async function onSubmit(data: LoanInput) {
    saveMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loan ? 'Edit Loan' : 'Add New Loan'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="mobile_app">Mobile App</SelectItem>
                        <SelectItem value="person">Person</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lenderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lender Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="principalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Balance</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loanTermMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Term (Months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Payment</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextPaymentDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Payment Due</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">{loan ? 'Update' : 'Create'} Loan</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
