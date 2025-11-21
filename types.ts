
export interface PricePoint {
  date: string;
  price: number;
  sp500: number;
  timestamp: number;
}

export interface StockData {
  id: string;
  name: string;
  ticker: string;
  periodStart: string;
  periodEnd: string;
  data: PricePoint[];
}

export interface TradeResult {
  stockName: string;
  ticker: string;
  initialCapital: number;
  finalCapital: number;
  userReturnPercent: number;
  stockReturnPercent: number;
  sp500ReturnPercent: number;
  sp500Start: number;
  sp500End: number;
  tradeCount: number;
  winningTrades: number;
  bestTradePct: number;
  worstTradePct: number;
}

export interface LeaderboardEntry {
  name: string;
  totalProfit: number;
  totalReturn: number;
  date: string;
  timestamp: number;
}

export enum GameState {
  INTRO,
  TRADING,
  ANALYSIS,
  GAMEOVER,
}

// --- GAMIFICATION TYPES ---

export type RankTitle = 'Intern' | 'Retail Trader' | 'Day Trader' | 'Analyst' | 'Fund Manager' | 'Market Maker' | 'Wolf of Wall St';

export interface PlayerProfile {
  totalCareerProfit: number;
  gamesPlayed: number;
  highestSessionReturn: number;
  unlockedAchievements: string[]; // IDs of unlocked achievements
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name representation
  condition: (history: TradeResult[], totalProfit: number) => boolean;
}

export interface RankInfo {
  title: RankTitle;
  minProfit: number;
  nextThreshold: number | null;
}
