import type { Loan, MonthlyBudget } from './db/schema';

export interface PaymentProjection {
  loanId: number;
  monthlyPayment: number;
  monthsToPayoff: number;
  totalInterest: number;
  payoffDate: Date;
}

export interface StrategyProjection {
  loans: PaymentProjection[];
  totalMonths: number;
  totalInterest: number;
  interestSavings: number;
  timeSavings: number;
  extraPaymentAllocations: Record<number, number>;
}

/**
 * Calculate monthly interest rate from APR
 */
export function calculateMonthlyRate(apr: number): number {
  return apr / 100 / 12;
}

/**
 * Calculate payoff date based on payment schedule
 */
export function calculatePayoffDate(
  balance: number,
  monthlyPayment: number,
  interestRate: number,
  startDate: Date
): Date {
  if (monthlyPayment <= 0 || balance <= 0) {
    return startDate;
  }

  const monthlyRate = calculateMonthlyRate(interestRate);
  let currentBalance = balance;
  let months = 0;
  const maxMonths = 600; // 50 years max

  while (currentBalance > 0.01 && months < maxMonths) {
    const interest = currentBalance * monthlyRate;
    const principal = monthlyPayment - interest;

    if (principal <= 0) {
      // Payment doesn't cover interest, loan will never be paid off
      return new Date(startDate.getTime() + maxMonths * 30 * 24 * 60 * 60 * 1000);
    }

    currentBalance = Math.max(0, currentBalance - principal);
    months++;
  }

  const payoffDate = new Date(startDate);
  payoffDate.setMonth(payoffDate.getMonth() + months);
  return payoffDate;
}

/**
 * Calculate total interest to be paid
 */
export function calculateTotalInterest(
  balance: number,
  monthlyPayment: number,
  interestRate: number
): number {
  if (monthlyPayment <= 0 || balance <= 0) {
    return 0;
  }

  const monthlyRate = calculateMonthlyRate(interestRate);
  let currentBalance = balance;
  let totalInterest = 0;
  const maxMonths = 600;

  while (currentBalance > 0.01 && totalInterest < balance * 100) {
    const interest = currentBalance * monthlyRate;
    const principal = monthlyPayment - interest;

    if (principal <= 0) {
      break;
    }

    totalInterest += interest;
    currentBalance = Math.max(0, currentBalance - principal);
  }

  return Math.round(totalInterest * 100) / 100;
}

/**
 * Calculate total monthly obligation (sum of all minimum payments)
 */
export function calculateMonthlyObligation(loans: Loan[]): number {
  return loans
    .filter((loan) => loan.isActive)
    .reduce((sum, loan) => sum + Number(loan.minimumPayment), 0);
}

/**
 * Calculate available extra funds (monthly allocation - total minimum payments)
 */
export function calculateAvailableExtraFunds(
  monthlyAllocation: number,
  loans: Loan[]
): number {
  const monthlyObligation = calculateMonthlyObligation(loans);
  return Math.max(0, monthlyAllocation - monthlyObligation);
}

/**
 * Distribute monthly budget across loans based on strategy
 */
export function distributeBudgetAcrossLoans(
  loans: Loan[],
  monthlyAllocation: number,
  strategyType: 'snowball' | 'avalanche' | 'custom' | null
): Record<number, number> {
  const activeLoans = loans.filter((loan) => loan.isActive);
  const allocations: Record<number, number> = {};

  // Start with minimum payments for all loans
  activeLoans.forEach((loan) => {
    allocations[loan.id] = Number(loan.minimumPayment);
  });

  const totalMinimumPayments = calculateMonthlyObligation(loans);
  const extraFunds = monthlyAllocation - totalMinimumPayments;

  if (extraFunds <= 0 || !strategyType) {
    return allocations;
  }

  // Sort loans based on strategy
  let sortedLoans: Loan[];
  if (strategyType === 'snowball') {
    sortedLoans = [...activeLoans].sort(
      (a, b) => Number(a.currentBalance) - Number(b.currentBalance)
    );
  } else if (strategyType === 'avalanche') {
    sortedLoans = [...activeLoans].sort(
      (a, b) => Number(b.interestRate) - Number(a.interestRate)
    );
  } else {
    // custom - sort by priority_order
    sortedLoans = [...activeLoans].sort((a, b) => {
      const aPriority = a.priorityOrder ?? 999;
      const bPriority = b.priorityOrder ?? 999;
      return aPriority - bPriority;
    });
  }

  // Distribute extra funds based on strategy
  // In snowball/avalanche, once a loan is paid off, its payment rolls to the next
  let remainingExtra = extraFunds;
  let currentLoanIndex = 0;

  while (remainingExtra > 0.01 && currentLoanIndex < sortedLoans.length) {
    const loan = sortedLoans[currentLoanIndex];
    const currentBalance = Number(loan.currentBalance);
    const currentAllocation = allocations[loan.id];
    const monthlyRate = calculateMonthlyRate(Number(loan.interestRate));

    // Calculate interest for this month
    const interest = currentBalance * monthlyRate;
    
    // Calculate how much principal we can pay (can't exceed balance)
    // Total payment = interest + principal
    // Principal payment = total payment - interest
    // We want to pay as much as possible up to the balance
    const maxPrincipalPayment = currentBalance;
    const maxTotalPayment = interest + maxPrincipalPayment;

    // How much principal are we currently paying?
    const currentPrincipalPayment = Math.max(0, currentAllocation - interest);
    
    // How much more principal can we pay?
    const remainingPrincipalCapacity = maxPrincipalPayment - currentPrincipalPayment;

    if (remainingPrincipalCapacity > 0.01) {
      // Allocate extra funds to this loan
      const additionalPayment = Math.min(
        remainingExtra,
        remainingPrincipalCapacity
      );
      allocations[loan.id] += additionalPayment;
      remainingExtra -= additionalPayment;
    }

    // Check if this loan is fully paid off or can't take more
    const newTotalPayment = allocations[loan.id];
    const newPrincipalPayment = Math.max(0, newTotalPayment - interest);
    const isPaidOff = newPrincipalPayment >= currentBalance - 0.01;
    const cantTakeMore = remainingPrincipalCapacity <= 0.01;

    if (isPaidOff || cantTakeMore) {
      // Loan is paid off or can't take more, move to next loan
      // In snowball/avalanche, when a loan is paid off, its minimum payment
      // should roll to the next loan, but we're already distributing extra funds
      // so we just move to the next loan
      currentLoanIndex++;
    } else if (remainingExtra <= 0.01) {
      // No more extra funds to distribute
      break;
    }
  }

  return allocations;
}

/**
 * Simulate loan payoff with rollover payments
 * This properly accounts for when loans are paid off and their payments roll to other loans
 */
function simulateLoanPayoff(
  loans: Loan[],
  monthlyAllocation: number,
  strategyType: 'snowball' | 'avalanche' | 'custom' | null
): {
  projections: PaymentProjection[];
  totalMonths: number;
  totalInterest: number;
} {
  // Create working copies of loans with current balances
  const workingLoans = loans.map((loan) => ({
    id: loan.id,
    currentBalance: Number(loan.currentBalance),
    minimumPayment: Number(loan.minimumPayment),
    interestRate: Number(loan.interestRate),
    startDate: new Date(loan.startDate),
    priorityOrder: loan.priorityOrder ?? 999,
  }));

  const projections: PaymentProjection[] = workingLoans.map((loan) => ({
    loanId: loan.id,
    monthlyPayment: loan.minimumPayment,
    monthsToPayoff: 0,
    totalInterest: 0,
    payoffDate: loan.startDate,
  }));

  let month = 0;
  const maxMonths = 600; // 50 years max
  let totalInterestPaid = 0;
  const monthlyRateCache: Record<number, number> = {};

  // Pre-calculate monthly rates
  workingLoans.forEach((loan) => {
    monthlyRateCache[loan.id] = calculateMonthlyRate(loan.interestRate);
  });

  while (workingLoans.length > 0 && month < maxMonths) {
    // Determine how to allocate payments this month
    let availableFunds = monthlyAllocation;
    const paymentsThisMonth: Record<number, number> = {};

    // Start with minimum payments for all active loans
    workingLoans.forEach((loan) => {
      paymentsThisMonth[loan.id] = loan.minimumPayment;
      availableFunds -= loan.minimumPayment;
    });

    // If we have extra funds and a strategy, distribute them
    if (availableFunds > 0.01 && strategyType) {
      // Sort loans based on strategy
      let sortedLoans = [...workingLoans];
      if (strategyType === 'snowball') {
        sortedLoans.sort((a, b) => a.currentBalance - b.currentBalance);
      } else if (strategyType === 'avalanche') {
        sortedLoans.sort((a, b) => b.interestRate - a.interestRate);
      } else {
        // custom - sort by priority_order
        sortedLoans.sort((a, b) => a.priorityOrder - b.priorityOrder);
      }

      // Distribute extra funds
      for (const loan of sortedLoans) {
        if (availableFunds <= 0.01) break;

        const monthlyRate = monthlyRateCache[loan.id];
        const interest = loan.currentBalance * monthlyRate;
        const currentPayment = paymentsThisMonth[loan.id];
        const currentPrincipal = Math.max(0, currentPayment - interest);
        const maxPrincipal = loan.currentBalance;
        const remainingCapacity = maxPrincipal - currentPrincipal;

        if (remainingCapacity > 0.01) {
          const additionalPayment = Math.min(availableFunds, remainingCapacity);
          paymentsThisMonth[loan.id] += additionalPayment;
          availableFunds -= additionalPayment;
        }
      }
    }

    // Apply payments and interest for this month
    const paidOffLoans: number[] = [];

    for (const loan of workingLoans) {
      const payment = paymentsThisMonth[loan.id] || 0;
      const monthlyRate = monthlyRateCache[loan.id];
      const interest = loan.currentBalance * monthlyRate;
      const principal = Math.min(loan.currentBalance, Math.max(0, payment - interest));

      totalInterestPaid += interest;
      loan.currentBalance = Math.max(0, loan.currentBalance - principal);

      // Update projection totals
      const projection = projections.find((p) => p.loanId === loan.id);
      if (projection) {
        projection.totalInterest += interest;
        projection.monthlyPayment = Math.max(projection.monthlyPayment, payment);
      }

      // Check if loan is paid off
      if (loan.currentBalance <= 0.01) {
        paidOffLoans.push(loan.id);
        if (projection) {
          projection.monthsToPayoff = month + 1;
          projection.payoffDate = new Date(loan.startDate);
          projection.payoffDate.setMonth(projection.payoffDate.getMonth() + month + 1);
        }
      }
    }

    // Remove paid off loans (their payments will naturally roll to remaining loans)
    workingLoans.splice(0, workingLoans.length, ...workingLoans.filter(
      (loan) => !paidOffLoans.includes(loan.id)
    ));

    month++;
  }

  // Set remaining loans to max months if they weren't paid off
  workingLoans.forEach((loan) => {
    const projection = projections.find((p) => p.loanId === loan.id);
    if (projection && projection.monthsToPayoff === 0) {
      projection.monthsToPayoff = month;
      projection.payoffDate = new Date(loan.startDate);
      projection.payoffDate.setMonth(projection.payoffDate.getMonth() + month);
    }
  });

  const totalMonths = Math.max(...projections.map((p) => p.monthsToPayoff), 0);

  return {
    projections,
    totalMonths,
    totalInterest: Math.round(totalInterestPaid * 100) / 100,
  };
}

/**
 * Calculate strategy projections
 */
export function calculateStrategyProjections(
  loans: Loan[],
  monthlyBudget: MonthlyBudget | null,
  strategyType: 'snowball' | 'avalanche' | 'custom' | null
): StrategyProjection {
  const activeLoans = loans.filter((loan) => loan.isActive);
  const monthlyObligation = calculateMonthlyObligation(activeLoans);
  const monthlyAllocation = monthlyBudget
    ? Number(monthlyBudget.monthlyAllocation)
    : monthlyObligation;

  // Calculate minimum payment scenario (no strategy, just minimums with rollover)
  // Always use only the sum of minimum payments, regardless of budget
  const minPaymentSimulation = simulateLoanPayoff(
    activeLoans,
    monthlyObligation, // Always use minimum payments only
    null // No strategy for minimum payment scenario
  );

  // Calculate strategy scenario (uses budget if available)
  const strategySimulation = strategyType
    ? simulateLoanPayoff(activeLoans, monthlyAllocation, strategyType)
    : minPaymentSimulation;

  // Calculate allocations for display (initial allocation, not accounting for rollover)
  const allocations = distributeBudgetAcrossLoans(
    activeLoans,
    monthlyAllocation,
    strategyType
  );

  const extraPaymentAllocations: Record<number, number> = {};
  activeLoans.forEach((loan) => {
    const allocation = allocations[loan.id] || Number(loan.minimumPayment);
    const minimum = Number(loan.minimumPayment);
    const extra = allocation - minimum;
    // Use a more lenient threshold to account for floating point precision
    if (extra > 0.001) {
      extraPaymentAllocations[loan.id] = Math.round(extra * 100) / 100;
    }
  });

  return {
    loans: strategySimulation.projections,
    totalMonths: strategySimulation.totalMonths,
    totalInterest: strategySimulation.totalInterest,
    interestSavings: minPaymentSimulation.totalInterest - strategySimulation.totalInterest,
    timeSavings: minPaymentSimulation.totalMonths - strategySimulation.totalMonths,
    extraPaymentAllocations,
  };
}

