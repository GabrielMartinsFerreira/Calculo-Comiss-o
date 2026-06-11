import type { CommissionBracket } from "./types";

export const COMMISSION_BRACKETS: CommissionBracket[] = [
  { label: "Mini Meta", min: 0, max: 50000, rate: 0.015, color: "#3b82f6" },
  { label: "Meta", min: 50000.01, max: 70000, rate: 0.02, color: "#10b981" },
  { label: "Mega Meta", min: 70000.01, max: Infinity, rate: 0.025, color: "#f59e0b" },
];

export function calculateCommission(totalSales: number): number {
  if (totalSales <= 0) return 0;
  if (totalSales <= 50000) return totalSales * 0.015;
  if (totalSales <= 70000) return totalSales * 0.02;
  return totalSales * 0.025;
}

export function getCommissionRate(totalSales: number): number {
  if (totalSales <= 50000) return 0.015;
  if (totalSales <= 70000) return 0.02;
  return 0.025;
}

export function getCurrentBracket(totalSales: number): CommissionBracket {
  if (totalSales <= 50000) return COMMISSION_BRACKETS[0];
  if (totalSales <= 70000) return COMMISSION_BRACKETS[1];
  return COMMISSION_BRACKETS[2];
}

export function getNextBracket(totalSales: number): CommissionBracket | null {
  if (totalSales < 50000) return COMMISSION_BRACKETS[1];
  if (totalSales < 70000) return COMMISSION_BRACKETS[2];
  return null;
}

export function getProgressToNextBracket(totalSales: number): {
  progress: number;
  remaining: number;
  nextTarget: number | null;
} {
  if (totalSales <= 50000) {
    return {
      progress: (totalSales / 50000) * 100,
      remaining: 50000 - totalSales,
      nextTarget: 50000,
    };
  }
  if (totalSales <= 70000) {
    return {
      progress: ((totalSales - 50000) / 20000) * 100,
      remaining: 70000 - totalSales,
      nextTarget: 70000,
    };
  }
  return { progress: 100, remaining: 0, nextTarget: null };
}
