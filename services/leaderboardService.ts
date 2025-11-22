
import { LeaderboardEntry } from '../types';

const STORAGE_KEY = 'trading_simulator_leaderboard';
const API_URL = '/.netlify/functions/leaderboard';

// --- LOCAL STORAGE HELPERS (Backup) ---
const getLocalLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

const saveLocalScore = (entry: LeaderboardEntry): LeaderboardEntry[] => {
  const current = getLocalLeaderboard();
  const updated = [...current, entry].sort((a, b) => b.totalReturn - a.totalReturn).slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

// --- PUBLIC API ---

export const getCombinedLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  // 1. Try Netlify Function (Neon Database)
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
    } else {
      console.warn(`API Error ${response.status}:`, await response.text());
    }
  } catch (e) {
    console.warn("Offline or API not configured, using local data");
  }

  // 2. Fallback to Local if API fails
  const localScores = getLocalLeaderboard();
  // Sort by Return % (descending)
  return localScores.sort((a, b) => b.totalReturn - a.totalReturn).slice(0, 10);
};

export const saveScore = async (name: string, totalProfit: number, totalReturn: number): Promise<LeaderboardEntry[]> => {
  const newEntry: LeaderboardEntry = {
    name: name.trim() || 'Anonymous Trader',
    totalProfit,
    totalReturn,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
  };

  // 1. Always save locally as backup
  const localResult = saveLocalScore(newEntry);

  // 2. Try saving to Netlify Function (Neon)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    });

    if (response.ok) {
      const freshLeaderboard = await response.json();
      return freshLeaderboard;
    } else {
      console.error("Failed to save to cloud. Status:", response.status);
      console.error("Response:", await response.text());
    }
  } catch (e) {
    console.error("Network error while saving:", e);
  }

  return localResult;
};

export const calculatePercentile = (profit: number): string => {
  // Adjusted for Return % rather than just raw profit to make it more realistic for a "return" based game
  // Using arbitrary distribution for game feel
  const mean = 5; 
  const stdDev = 15; 
  const z = (profit - mean) / stdDev; // Note: using profit var name but logic applies to general score

  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  if (z > 0) prob = 1 - prob;
  
  let percentile = prob * 100;
  if (percentile > 99.9) percentile = 99.9;
  if (percentile < 1) percentile = 1;

  return percentile.toFixed(1);
};
