import type { Loan } from './db/schema';

/**
 * Sort loans by snowball method (smallest balance first)
 */
export function sortBySnowball(loans: Loan[]): Loan[] {
  return [...loans].sort(
    (a, b) => Number(a.currentBalance) - Number(b.currentBalance)
  );
}

/**
 * Sort loans by avalanche method (highest interest rate first)
 */
export function sortByAvalanche(loans: Loan[]): Loan[] {
  return [...loans].sort(
    (a, b) => Number(b.interestRate) - Number(a.interestRate)
  );
}

/**
 * Sort loans by custom priority order
 */
export function sortByCustom(loans: Loan[]): Loan[] {
  return [...loans].sort((a, b) => {
    const aPriority = a.priorityOrder ?? 999;
    const bPriority = b.priorityOrder ?? 999;
    return aPriority - bPriority;
  });
}

/**
 * Apply strategy and return sorted loans
 */
export function applyStrategy(
  loans: Loan[],
  strategyType: 'snowball' | 'avalanche' | 'custom' | null
): Loan[] {
  const activeLoans = loans.filter((loan) => loan.isActive);

  if (!strategyType) {
    return activeLoans;
  }

  switch (strategyType) {
    case 'snowball':
      return sortBySnowball(activeLoans);
    case 'avalanche':
      return sortByAvalanche(activeLoans);
    case 'custom':
      return sortByCustom(activeLoans);
    default:
      return activeLoans;
  }
}

