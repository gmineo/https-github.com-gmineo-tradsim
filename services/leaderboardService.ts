
import { LeaderboardEntry } from '../types';
import { LEADERBOARD_CONFIG } from '../constants';

const API_URL = '/.netlify/functions/leaderboard';

// --- LOCAL STORAGE HELPERS (Backup) ---
const getLocalLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(LEADERBOARD_CONFIG.STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

const saveLocalScore = (entry: LeaderboardEntry): LeaderboardEntry[] => {
  const current = getLocalLeaderboard();
  const updated = [...current, entry]
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .slice(0, LEADERBOARD_CONFIG.MAX_LOCAL_ENTRIES);
  localStorage.setItem(LEADERBOARD_CONFIG.STORAGE_KEY, JSON.stringify(updated));
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
  return localScores
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .slice(0, LEADERBOARD_CONFIG.MAX_DISPLAY_ENTRIES);
};

export const saveScore = async (name: string, totalProfit: number, totalReturn: number): Promise<LeaderboardEntry[]> => {
  const safeProfit = Number.isFinite(totalProfit) ? totalProfit : 0;
  const safeReturn = Number.isFinite(totalReturn) ? totalReturn : 0;
  
  const newEntry: LeaderboardEntry = {
    name: name.trim() || 'Anonymous Trader',
    totalProfit: safeProfit,
    totalReturn: safeReturn,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
  };

  console.log("Saving score:", newEntry);

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
      console.log("Cloud save successful", freshLeaderboard);
      return freshLeaderboard;
    } else {
      const errorText = await response.text();
      console.error(`CLOUD SAVE FAILED (${response.status}):`, errorText);
    }
  } catch (e) {
    console.error("Network error while saving score:", e);
  }

  return localResult;
};

export const calculatePercentile = (profit: number): string => {
  // Adjusted for Return % rather than just raw profit
  const mean = LEADERBOARD_CONFIG.PERCENTILE_MEAN; 
  const stdDev = LEADERBOARD_CONFIG.PERCENTILE_STD_DEV; 
  const z = (profit - mean) / stdDev; 

  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  if (z > 0) prob = 1 - prob;
  
  let percentile = prob * 100;
  if (percentile > 99.9) percentile = 99.9;
  if (percentile < 1) percentile = 1;

  return percentile.toFixed(1);
};
