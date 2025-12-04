
import React, { useState, useEffect, useRef } from 'react';
import { TradeResult, LeaderboardEntry, RankInfo, Achievement } from '../types';
import { Button } from './Button';
import { Trophy, RefreshCw, Save, User, Twitter, Linkedin, Star, Zap, Footprints, Crosshair, Gem, Skull, Crown, Award, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { saveScore, getCombinedLeaderboard, calculatePercentile } from '../services/leaderboardService';
import { playerService } from '../services/playerService';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { calculateTotalProfit, calculateAverageReturn, calculateWinRate, getBestTrade } from '../utils/calculations';
import { PLAYER_CONFIG } from '../constants';
import { getRankIconLarge } from '../utils/leaderboard';

interface GameOverScreenProps {
  history: TradeResult[];
  onRestart: () => void;
}

// Helper to render dynamic icons based on string name
const IconMap: Record<string, React.FC<any>> = {
  'Footprints': Footprints,
  'Crosshair': Crosshair,
  'Gem': Gem,
  'Skull': Skull,
  'Crown': Crown,
};

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ history, onRestart }) => {
  const [playerName, setPlayerName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Progression State
  const [rank, setRank] = useState<RankInfo | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [careerProfit, setCareerProfit] = useState(0);
  
  // Percentile State
  const [percentileStr, setPercentileStr] = useState("0");
  const [globalRanking, setGlobalRanking] = useState(0); 

  // Refs to prevent double processing in StrictMode
  const processedRef = useRef(false);

  // Calculate totals using utility functions
  const totalProfit = calculateTotalProfit(history);
  const averageUserReturn = calculateAverageReturn(history, 'userReturnPercent');
  const averageStockReturn = calculateAverageReturn(history, 'stockReturnPercent');
  const averageSP500Return = calculateAverageReturn(history, 'sp500ReturnPercent');
  const bestTrade = getBestTrade(history);
  const winRate = calculateWinRate(history);
  
  // Process Game Result & Progression ONCE
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Update Player Profile
    const { newProfile, newAchievements: unlocked, leveledUp } = playerService.updateProfile(history, totalProfit, averageUserReturn);
    const currentRank = playerService.getRank(newProfile.totalCareerProfit);
    
    setRank(currentRank);
    setCareerProfit(newProfile.totalCareerProfit);
    setNewAchievements(unlocked);
    setIsLevelUp(leveledUp);

    // Initial Leaderboard fetch (async)
    getCombinedLeaderboard().then(data => setLeaderboard(data));
    
    // Calculate Percentile
    const pStr = calculatePercentile(totalProfit);
    setPercentileStr(pStr);
    setGlobalRanking(Math.floor(10000 - (parseFloat(pStr) * 100)) + 1);

    // Calculate Progress Bar
    if (currentRank.nextThreshold) {
      const prevThreshold = currentRank.minProfit;
      const totalRange = currentRank.nextThreshold - prevThreshold;
      const progress = newProfile.totalCareerProfit - prevThreshold;
      const pct = Math.max(0, Math.min(100, (progress / totalRange) * 100));
      setProgressPercent(pct);
    } else {
      setProgressPercent(100); // Max rank
    }

  }, [history, totalProfit, averageUserReturn]);

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newLeaderboard = await saveScore(playerName, totalProfit, averageUserReturn);
      setLeaderboard(newLeaderboard);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to submit", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sharing
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `I just achieved a ${formatPercentage(averageUserReturn)} average return on Trading Simulator! 🚀\n\nRank: ${rank?.title}\n\nCan you beat my score?`;
  
  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };
  const shareOnLinkedin = () => {
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText + " " + shareUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-y-auto custom-scrollbar">
      
      <div className="p-6 pb-20"> {/* Padding bottom for fixed play button */}
        
        <div className="text-center mt-2 mb-6">
          <Trophy size={40} className="mx-auto text-yellow-500 mb-2" />
          <h1 className="text-3xl font-black text-white mb-1">SESSION COMPLETE</h1>
          <p className="text-slate-400 text-xs uppercase tracking-wider">Performance Summary</p>
        </div>

        {/* GLOBAL COMPARISON BANNER */}
        <div className="mb-6 bg-blue-200 text-blue-900 p-4 rounded-lg border-l-8 border-blue-600 shadow-lg animate-in slide-in-from-left duration-700">
          <p className="font-serif text-lg leading-tight">
            You outperformed <span className="font-bold">{percentileStr}%</span> of players, ranking <span className="font-bold">#{globalRanking}</span>. <span onClick={shareOnTwitter} className="text-blue-700 underline cursor-pointer hover:text-blue-900 font-bold">Tweet</span>
          </p>
        </div>

        {/* 1. Main Score Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 text-center mb-6 shadow-2xl">
          <span className="text-slate-400 text-xs font-bold uppercase block mb-2">Average Session Return</span>
          
          <div className={`text-5xl font-black mb-4 ${averageUserReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercentage(averageUserReturn)}
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <p className="text-slate-300 font-serif text-sm leading-relaxed">
              Your returns were <span className={averageUserReturn >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{averageUserReturn.toFixed(1)}%</span>, 
              against the stock's <span className="text-white font-bold">{averageStockReturn.toFixed(1)}%</span> and 
              the S&P's <span className="text-blue-400 font-bold">{averageSP500Return.toFixed(1)}%</span>.
            </p>
          </div>
        </div>

        {/* 2. INDIVIDUAL STOCK BREAKDOWN */}
        <div className="mb-8">
           <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3 text-center">Trade Breakdown</h3>
           <div className="space-y-3">
             {history.map((trade, idx) => (
               <div key={idx} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center shadow-md">
                  
                  {/* Stock Info */}
                  <div className="flex flex-col text-left w-1/3">
                    <div className="font-black text-white text-lg leading-none">{trade.ticker}</div>
                    <div className="text-[10px] text-slate-500 truncate">{trade.stockName}</div>
                  </div>

                  {/* Market Return Context */}
                  <div className="flex flex-col text-center w-1/3 border-l border-slate-700/50 border-r px-2">
                     <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Market</div>
                     <div className={`text-xs font-bold ${trade.stockReturnPercent >= 0 ? 'text-slate-300' : 'text-slate-400'}`}>
                        {formatPercentage(trade.stockReturnPercent)}
                     </div>
                  </div>

                  {/* User Result */}
                  <div className="flex flex-col text-right w-1/3">
                     <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">You</div>
                     <div className={`font-mono font-black text-sm flex items-center justify-end gap-1 ${trade.userReturnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.userReturnPercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatPercentage(trade.userReturnPercent)}
                     </div>
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* 3. Progression Section */}
        {rank && (
          <div className="mb-8 relative overflow-hidden bg-slate-800 border border-slate-700 rounded-xl p-5">
            {/* Level Up Overlay Effect */}
            {isLevelUp && (
              <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center z-10 pointer-events-none animate-pulse">
                 <div className="bg-black/80 text-yellow-400 border border-yellow-500 px-4 py-2 rounded-lg transform rotate-[-5deg] font-black text-xl shadow-xl">
                    LEVEL UP!
                 </div>
              </div>
            )}

            <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Career Rank</span>
                <span className="text-xl font-black text-white flex items-center gap-2">
                  {rank.title}
                  {isLevelUp && <Zap size={18} className="text-yellow-400 fill-current animate-bounce" />}
                </span>
              </div>
              <div className="text-right">
                 <span className="text-[10px] text-slate-400 font-mono block">Total Career Profit</span>
                 <span className={`font-mono font-bold ${careerProfit >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                   {formatCurrency(careerProfit)}
                 </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/50 relative">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>{formatCurrency(rank.minProfit)}</span>
              <span>{rank.nextThreshold ? formatCurrency(rank.nextThreshold) : '∞'}</span>
            </div>
          </div>
        )}

        {/* 4. New Achievements Unlocked */}
        {newAchievements.length > 0 && (
          <div className="mb-6 animate-in zoom-in duration-500">
             <h3 className="text-center text-yellow-400 font-bold uppercase text-xs tracking-widest mb-3 flex items-center justify-center gap-2">
               <Star size={14} fill="currentColor" /> Unlocked Badges
             </h3>
             <div className="grid grid-cols-1 gap-2">
               {newAchievements.map(ach => {
                 const Icon = IconMap[ach.icon] || Award;
                 return (
                   <div key={ach.id} className="bg-gradient-to-r from-yellow-900/20 to-slate-800 border border-yellow-500/30 p-3 rounded-lg flex items-center gap-3">
                     <div className="p-2 bg-slate-900 rounded-full border border-yellow-500/50 text-yellow-400">
                       <Icon size={18} />
                     </div>
                     <div>
                       <div className="text-yellow-100 font-bold text-sm">{ach.title}</div>
                       <div className="text-yellow-500/70 text-xs">{ach.description}</div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {/* 5. Submit Score / Leaderboard Toggle */}
        {!isSubmitted ? (
          <div className="w-full max-w-md mx-auto mb-6">
            <form onSubmit={handleSubmitScore} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="text-slate-300 font-bold text-sm mb-3 flex items-center gap-2">
                <User size={16} className="text-blue-400" />
                Post to Global Leaderboard
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={PLAYER_CONFIG.MAX_NAME_LENGTH}
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-bold text-sm"
                />
                <Button type="submit" disabled={!playerName.trim() || isSubmitting} className="px-4 py-2 text-sm">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                  Requires internet connection
              </p>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto mb-6 animate-in fade-in">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                   <Trophy size={14} className="text-yellow-500" />
                   Global Leaders
                 </h3>
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                {leaderboard.map((entry, idx) => {
                   // Simple check for 'current run' highlighting using name and score match
                   const isCurrentRun = entry.name === playerName && entry.totalProfit === totalProfit;
                   return (
                    <div 
                      key={idx} 
                      className={`flex justify-between items-center p-2 border-b border-slate-700/50 last:border-0 ${isCurrentRun ? 'bg-blue-900/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 flex justify-center">{getRankIconLarge(idx)}</div>
                        <span className={`font-bold text-xs ${isCurrentRun ? 'text-blue-300' : 'text-slate-300'}`}>{entry.name}</span>
                      </div>
                      <div className={`font-mono text-xs font-bold ${entry.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${Math.floor(entry.totalProfit)}
                      </div>
                    </div>
                   );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6. Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 max-w-md mx-auto w-full">
          <div className="bg-slate-800 p-3 rounded border border-slate-700 text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Best Trade</span>
            <span className="text-sm font-bold text-emerald-400">{formatPercentage(bestTrade)}</span>
          </div>
          <div className="bg-slate-800 p-3 rounded border border-slate-700 text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Accuracy</span>
            <span className="text-sm font-bold text-blue-400">{winRate.toFixed(0)}%</span>
          </div>
        </div>

        {/* 7. Socials */}
        <div className="flex gap-2 mb-4 max-w-md mx-auto w-full">
          <button 
            onClick={shareOnTwitter}
            className="flex-1 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/50 text-[#1DA1F2] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Twitter size={16} /> Twitter
          </button>
          <button 
            onClick={shareOnLinkedin}
            className="flex-1 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/50 text-[#0077b5] py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Linkedin size={16} /> LinkedIn
          </button>
        </div>

      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-900/90 backdrop-blur border-t border-slate-800 z-50">
        <Button onClick={onRestart} fullWidth variant="secondary" className="flex items-center justify-center gap-2 py-4 shadow-xl shadow-emerald-900/20">
          <RefreshCw size={20} />
          PLAY AGAIN
        </Button>
      </div>

    </div>
  );
};
