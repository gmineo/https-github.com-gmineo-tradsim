
import { LeaderboardEntry } from '../types';

const STORAGE_KEY = 'trading_simulator_leaderboard';

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse leaderboard", e);
    return [];
  }
};

export const saveScore = (name: string, totalProfit: number, totalReturn: number): LeaderboardEntry[] => {
  const currentLeaderboard = getLeaderboard();
  
  const newEntry: LeaderboardEntry = {
    name: name.trim() || 'Anonymous Trader',
    totalProfit,
    totalReturn,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
  };

  const updatedLeaderboard = [...currentLeaderboard, newEntry];

  // Sort by Total Profit (Descending)
  updatedLeaderboard.sort((a, b) => b.totalProfit - a.totalProfit);

  // Keep top 50 to save space
  const topScores = updatedLeaderboard.slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
  } catch (e) {
    console.error("Failed to save score", e);
  }

  return topScores;
};
