/**
 * Utility functions for formatting values
 */

export const formatCurrency = (val: number): string => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}$${Math.abs(Math.floor(val))}`;
};

export const formatPercentage = (val: number): string => {
  if (val === -Infinity || val === Infinity) return '0.0%';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};

export const formatPercentageWithSign = (val: number): string => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};

