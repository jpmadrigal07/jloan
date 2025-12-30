'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type StrategyType = 'snowball' | 'avalanche' | 'custom' | null;

function getStrategyLabel(strategyType: StrategyType): string {
  if (strategyType === 'snowball') return 'Snowball Method';
  if (strategyType === 'avalanche') return 'Avalanche Method';
  if (strategyType === 'custom') return 'Custom Priority';
  return 'Payment Strategy';
}

export function StrategySelector() {
  const [strategyType, setStrategyType] = useState<StrategyType>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchStrategy();
  }, []);

  async function fetchStrategy() {
    try {
      const response = await fetch('/api/loans/strategy');
      if (response.ok) {
        const data = await response.json();
        // Get strategy type from API response (explicitly returned)
        if (data.strategyType !== undefined) {
          setStrategyType(data.strategyType);
        } else if (data.loans && data.loans.length > 0) {
          // Fallback to first loan's strategy type if not explicitly returned
          setStrategyType(data.loans[0].strategyType);
        } else {
          setStrategyType(null);
        }
      }
    } catch (error) {
      console.error('Error fetching strategy:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStrategyChange(newStrategy: StrategyType) {
    try {
      const response = await fetch('/api/loans/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategyType: newStrategy,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update state with the confirmed strategy from the server
        setStrategyType(data.strategyType);
        setOpen(false);
        // Small delay to ensure database update is committed before reload
        setTimeout(() => {
          // Trigger a page refresh to update projections
          window.location.reload();
        }, 100);
      } else {
        const error = await response.json();
        console.error('Error updating strategy:', error);
        alert('Failed to update strategy. Please try again.');
        // Revert to previous strategy on error
        await fetchStrategy();
      }
    } catch (error) {
      console.error('Error updating strategy:', error);
      alert('Failed to update strategy. Please try again.');
      // Revert to previous strategy on error
      await fetchStrategy();
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={loading}
      >
        {loading ? 'Loading...' : getStrategyLabel(strategyType)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Strategy</DialogTitle>
            <DialogDescription>
              Select a payment strategy to prioritize loan payments
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={strategyType || ''}
            onValueChange={(value) =>
              handleStrategyChange(
                value === '' ? null : (value as StrategyType)
              )
            }
            className="space-y-4 mt-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="snowball" id="snowball" />
              <Label htmlFor="snowball" className="cursor-pointer">
                <div className="font-medium">Snowball Method</div>
                <div className="text-sm text-muted-foreground">
                  Pay smallest balance first
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="avalanche" id="avalanche" />
              <Label htmlFor="avalanche" className="cursor-pointer">
                <div className="font-medium">Avalanche Method</div>
                <div className="text-sm text-muted-foreground">
                  Pay highest interest rate first
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="cursor-pointer">
                <div className="font-medium">Custom Priority</div>
                <div className="text-sm text-muted-foreground">
                  Set your own priority order
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="none" />
              <Label htmlFor="none" className="cursor-pointer">
                <div className="font-medium">No Strategy</div>
                <div className="text-sm text-muted-foreground">
                  Pay minimum payments only
                </div>
              </Label>
            </div>
          </RadioGroup>
        </DialogContent>
      </Dialog>
    </>
  );
}
