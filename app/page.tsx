import { LoansTable } from './components/loans-table';
import { SummaryCards } from './components/summary-cards';
import { BudgetManager } from './components/budget-manager';
import { StrategySelector } from './components/strategy-selector';
import { ProjectionsPanel } from './components/projections-panel';
import { PaymentsOverview } from './components/payments-overview';

export default function Home() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Loan Management</h1>
      </div>

      <SummaryCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LoansTable />
          <ProjectionsPanel />
          <PaymentsOverview />
        </div>
        <div className="space-y-6">
          <BudgetManager />
          <StrategySelector />
        </div>
      </div>
    </div>
  );
}