
import { LeaderboardEntry } from '../types';
import { db, isFirebaseConfigured } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

const STORAGE_KEY = 'trading_simulator_leaderboard';

// --- MOCK GLOBAL DATA (Fallback) ---
const GLOBAL_BOTS: LeaderboardEntry[] = [
  { name: "Warren B.", totalProfit: 5200, totalReturn: 1040, date: "10/12/2023", timestamp: 1 },
  { name: "Nancy P.", totalProfit: 3800, totalReturn: 760, date: "11/05/2023", timestamp: 2 },
  { name: "WallStBetz", totalProfit: 2100, totalReturn: 420, date: "Today", timestamp: 3 },
  { name: "CryptoKing", totalProfit: 1500, totalReturn: 300, date: "Yesterday", timestamp: 4 },
  { name: "HODL_GANG", totalProfit: 950, totalReturn: 190, date: "Today", timestamp: 5 },
];

// --- LOCAL STORAGE HELPERS (Fallback) ---
const getLocalLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse local leaderboard", e);
    return [];
  }
};

const saveLocalScore = (entry: LeaderboardEntry): LeaderboardEntry[] => {
  const current = getLocalLeaderboard();
  const updated = [...current, entry].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

// --- PUBLIC API ---

/**
 * Fetches the leaderboard. 
 * If Firebase is configured, fetches real global data.
 * If not, returns Local Storage + Bots.
 */
export const getCombinedLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  // 1. Try Firebase
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "leaderboard"), orderBy("totalProfit", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const firebaseData: LeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        firebaseData.push(doc.data() as LeaderboardEntry);
      });
      
      if (firebaseData.length > 0) {
        return firebaseData;
      }
    } catch (e) {
      console.error("Error fetching from Firebase:", e);
      // Fall through to local
    }
  }

  // 2. Fallback to Local + Bots
  const localScores = getLocalLeaderboard();
  const combined = [...GLOBAL_BOTS, ...localScores];
  
  // Sort by Profit Descending and take top 5
  return combined.sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5);
};

export const saveScore = async (name: string, totalProfit: number, totalReturn: number): Promise<LeaderboardEntry[]> => {
  const newEntry: LeaderboardEntry = {
    name: name.trim() || 'Anonymous Trader',
    totalProfit,
    totalReturn,
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
  };

  // 1. Always save locally so the user sees their own score immediately even if offline
  const localResult = saveLocalScore(newEntry);

  // 2. Try saving to Firebase
  if (isFirebaseConfigured && db) {
    try {
      await addDoc(collection(db, "leaderboard"), newEntry);
      // Fetch fresh data to return the true global state
      return await getCombinedLeaderboard();
    } catch (e) {
      console.error("Error saving to Firebase:", e);
    }
  }

  return localResult;
};

/**
 * Calculates the player's percentile based on a simulated normal distribution.
 * This remains statistical rather than database-driven to avoid heavy queries.
 */
export const calculatePercentile = (profit: number): string => {
  const mean = 200; 
  const stdDev = 800; 
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
