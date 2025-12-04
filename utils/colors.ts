/**
 * Utility functions for color/theme logic
 */

/**
 * Returns the appropriate color class for positive/negative values
 */
export const getValueColor = (value: number): string => {
  return value >= 0 ? 'text-emerald-400' : 'text-red-400';
};

