import { PlayerProfile, RankInfo, TradeResult, Achievement, RankTitle } from '../types';
import { PLAYER_CONFIG } from '../constants';

const DEFAULT_PROFILE: PlayerProfile = {
  totalCareerProfit: 0,
  gamesPlayed: 0,
  highestSessionReturn: -Infinity,
  unlockedAchievements: [],
};

// --- RANKS DEFINITION ---
const RANKS: RankInfo[] = [
  { title: 'Intern', minProfit: 0, nextThreshold: 1000 },
  { title: 'Retail Trader', minProfit: 1000, nextThreshold: 5000 },
  { title: 'Day Trader', minProfit: 5000, nextThreshold: 20000 },
  { title: 'Analyst', minProfit: 20000, nextThreshold: 100000 },
  { title: 'Fund Manager', minProfit: 100000, nextThreshold: 500000 },
  { title: 'Market Maker', minProfit: 500000, nextThreshold: 1000000 },
  { title: 'Wolf of Wall St', minProfit: 1000000, nextThreshold: null },
];

// --- ACHIEVEMENTS DEFINITION ---
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'First Steps',
    description: 'Complete your first trading session',
    icon: 'Footprints',
    condition: (h) => h.length > 0
  },
  {
    id: 'sniper',
    title: 'Sniper',
    description: 'Win 100% of trades in a session (min 3 trades)',
    icon: 'Crosshair',
    condition: (h) => {
      const totalTrades = h.reduce((acc, curr) => acc + curr.tradeCount, 0);
      const totalWins = h.reduce((acc, curr) => acc + curr.winningTrades, 0);
      return totalTrades >= 3 && totalTrades === totalWins;
    }
  },
  {
    id: 'diamond_hands',
    title: 'Diamond Hands',
    description: 'Hold a single trade for > 50% return',
    icon: 'Gem',
    condition: (h) => h.some(r => r.bestTradePct >= 0.5)
  },
  {
    id: 'rekt',
    title: 'Rekt',
    description: 'Lose 50% of your capital in one session',
    icon: 'Skull',
    condition: (h) => {
      const totalStart = h.reduce((acc, curr) => acc + curr.initialCapital, 0);
      const totalEnd = h.reduce((acc, curr) => acc + curr.finalCapital, 0);
      return (totalEnd - totalStart) / totalStart <= -0.5;
    }
  },
  {
    id: 'whale',
    title: 'Whale Status',
    description: 'Make over $2,000 profit in one session',
    icon: 'Crown',
    condition: (_, profit) => profit >= 2000
  }
];

export const playerService = {
  getProfile: (): PlayerProfile => {
    try {
      const stored = localStorage.getItem(PLAYER_CONFIG.STORAGE_KEY);
      return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  getRank: (careerProfit: number): RankInfo => {
    // Find the highest rank where minProfit <= careerProfit
    // If profit is negative, they are still an Intern (minProfit 0 handled by logic or Math.max)
    const validProfit = Math.max(0, careerProfit);
    const rank = RANKS.slice().reverse().find(r => validProfit >= r.minProfit);
    return rank || RANKS[0];
  },

  updateProfile: (sessionHistory: TradeResult[], sessionProfit: number, sessionReturn: number): { 
    newProfile: PlayerProfile, 
    newAchievements: Achievement[],
    leveledUp: boolean 
  } => {
    const currentProfile = playerService.getProfile();
    const oldRank = playerService.getRank(currentProfile.totalCareerProfit);
    
    // Update Stats
    const newTotalProfit = currentProfile.totalCareerProfit + sessionProfit;
    const newProfile: PlayerProfile = {
      totalCareerProfit: newTotalProfit,
      gamesPlayed: currentProfile.gamesPlayed + 1,
      highestSessionReturn: Math.max(currentProfile.highestSessionReturn, sessionReturn),
      unlockedAchievements: [...currentProfile.unlockedAchievements]
    };

    // Check Achievements
    const newlyUnlocked: Achievement[] = [];
    ACHIEVEMENTS.forEach(ach => {
      if (!newProfile.unlockedAchievements.includes(ach.id)) {
        if (ach.condition(sessionHistory, sessionProfit)) {
          newProfile.unlockedAchievements.push(ach.id);
          newlyUnlocked.push(ach);
        }
      }
    });

    // Save
    localStorage.setItem(PLAYER_CONFIG.STORAGE_KEY, JSON.stringify(newProfile));

    // Check Level Up
    const newRank = playerService.getRank(newTotalProfit);
    const leveledUp = newRank.title !== oldRank.title;

    return { newProfile, newAchievements: newlyUnlocked, leveledUp };
  }
};