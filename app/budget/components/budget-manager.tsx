'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBudgetSchema, type BudgetInput } from '@/lib/validations/budget-schema';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import type { MonthlyBudget } from '@/lib/db/schema';
import { calculateMonthlyObligation } from '@/lib/loan-calculations';
import type { Loan } from '@/lib/db/schema';

// Query functions
async function fetchBudget(): Promise<MonthlyBudget | null> {
  const response = await fetch('/api/budget?active=true');
  if (!response.ok) return null;
  return response.json();
}

async function fetchLoans(): Promise<Loan[]> {
  const response = await fetch('/api/loans?is_active=true');
  if (!response.ok) throw new Error('Failed to fetch loans');
  return response.json();
}

export function BudgetManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Fetch budget and loans with TanStack Query
  const { data: budget = null, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', { active: true }],
    queryFn: fetchBudget,
    staleTime: 60 * 1000, // 1 minute
  });

  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ['loans', { isActive: true }],
    queryFn: fetchLoans,
    staleTime: 60 * 1000, // 1 minute
  });

  const loading = budgetLoading || loansLoading;

  const form = useForm<BudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      monthlyAllocation: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: '',
    },
  });

  // Reset form when budget data changes
  useEffect(() => {
    if (budget) {
      form.reset({
        monthlyAllocation: Number(budget.monthlyAllocation),
        effectiveDate: budget.effectiveDate,
        isActive: budget.isActive,
        notes: budget.notes ?? '',
      });
    }
  }, [budget, form]);

  // Save budget mutation
  const saveBudgetMutation = useMutation({
    mutationFn: async (data: BudgetInput) => {
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save budget');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch budget (this will match ['budget', { active: true }] and all budget queries)
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      // Invalidate loan queries (for summary cards and calculations)
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      // Invalidate all payment queries (this will match ['payments'], ['payments', { status: 'overdue' }], etc.)
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      // Invalidate computed extra allocations (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['payments', 'extra-allocations'] });
      // Invalidate strategy queries (depends on loans and budget)
      queryClient.invalidateQueries({ queryKey: ['loans', 'strategy'] });
      // Invalidate all projection queries (this will match ['loans', 'projections', { strategyType }] for any strategyType)
      queryClient.invalidateQueries({ queryKey: ['loans', 'projections'] });
      
      setShowForm(false);
      
      // Dispatch custom event for backward compatibility with other components
      window.dispatchEvent(new CustomEvent('budget-updated'));
    },
    onError: (error: Error) => {
      console.error('Error saving budget:', error);
      alert(error.message || 'Failed to save budget. Please try again.');
    },
  });

  async function onSubmit(data: BudgetInput) {
    saveBudgetMutation.mutate(data);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const monthlyObligation = calculateMonthlyObligation(loans);
  const availableExtra = budget
    ? Number(budget.monthlyAllocation) - monthlyObligation
    : 0;
  const isInsufficient = budget && Number(budget.monthlyAllocation) < monthlyObligation;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Monthly Budget</CardTitle>
          <Button onClick={() => setShowForm(true)} size="sm">
            {budget ? 'Update' : 'Set'} Budget
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budget ? (
          <>
            <div>
              <div className="text-sm text-muted-foreground">
                Monthly Allocation
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(Number(budget.monthlyAllocation))}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">
                Minimum Payments Required
              </div>
              <div className="text-lg">
                {formatCurrency(monthlyObligation)}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">
                Available Extra Funds
              </div>
              <div
                className={`text-lg font-semibold ${isInsufficient ? 'text-red-600' : 'text-green-600'
                  }`}
              >
                {formatCurrency(availableExtra)}
              </div>
            </div>

            {isInsufficient && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Warning: Monthly allocation is insufficient to cover minimum
                payments.
              </div>
            )}

            {budget.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="text-sm">{budget.notes}</div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Effective: {new Date(budget.effectiveDate).toLocaleDateString()}
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No budget set. Set your monthly allocation to enable strategy
            calculations.
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {budget ? 'Update' : 'Set'} Monthly Budget
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="monthlyAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Allocation</FormLabel>
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
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Budget</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
