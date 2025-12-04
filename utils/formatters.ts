/**
 * Utility functions for formatting numbers and currency
 */

export const formatPercentage = (value: number, decimals: number = 1): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatCurrency = (value: number, decimals: number = 0): string => {
  return `$${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

