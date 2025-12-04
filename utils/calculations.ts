/**
 * Utility functions for calculations
 */

import { TradeResult } from '../types';

export const calculateTotalProfit = (history: TradeResult[]): number => {
  return history.reduce((acc, curr) => acc + (curr.finalCapital - curr.initialCapital), 0);
};

export const calculateAverageReturn = (history: TradeResult[], key: keyof TradeResult): number => {
  if (history.length === 0) return 0;
  const sum = history.reduce((acc, curr) => acc + (curr[key] as number), 0);
  return sum / history.length;
};

export const calculateWinRate = (history: TradeResult[]): number => {
  const totalTrades = history.reduce((acc, curr) => acc + curr.tradeCount, 0);
  const totalWins = history.reduce((acc, curr) => acc + curr.winningTrades, 0);
  return totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
};

export const getBestTrade = (history: TradeResult[]): number => {
  const bestTrades = history.map(h => h.bestTradePct).filter(n => n !== -Infinity);
  return bestTrades.length > 0 ? Math.max(...bestTrades) : 0;
};

export const calculatePnLPercent = (entryPrice: number, currentPrice: number): number => {
  return (currentPrice - entryPrice) / entryPrice;
};

export const calculateNewCapital = (capital: number, pnlPercent: number): number => {
  return capital * (1 + pnlPercent);
};

