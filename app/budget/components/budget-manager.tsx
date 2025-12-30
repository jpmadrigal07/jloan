'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

export function BudgetManager() {
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<BudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      monthlyAllocation: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: '',
    },
  });

  useEffect(() => {
    fetchBudget();
    fetchLoans();
  }, []);

  async function fetchBudget() {
    try {
      const response = await fetch('/api/budget?active=true');
      if (response.ok) {
        const data = await response.json();
        setBudget(data);
        if (data) {
          form.reset({
            monthlyAllocation: Number(data.monthlyAllocation),
            effectiveDate: data.effectiveDate,
            isActive: data.isActive,
            notes: data.notes ?? '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLoans() {
    try {
      const response = await fetch('/api/loans?is_active=true');
      const data = await response.json();
      setLoans(data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  }

  async function onSubmit(data: BudgetInput) {
    try {
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowForm(false);
        await fetchBudget();
        // Small delay to ensure database transaction is committed
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Dispatch custom event to notify other components (e.g., projections panel)
        window.dispatchEvent(new CustomEvent('budget-updated'));
      } else {
        const error = await response.json();
        console.error('Error saving budget:', error);
        alert('Failed to save budget. Please try again.');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget. Please try again.');
    }
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
