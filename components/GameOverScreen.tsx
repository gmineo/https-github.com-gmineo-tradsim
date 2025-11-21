import React, { useState, useEffect, useRef } from 'react';
import { TradeResult, LeaderboardEntry, RankInfo, Achievement } from '../types';
import { Button } from './Button';
import { Trophy, RefreshCw, Save, User, Medal, Twitter, Linkedin, Star, Shield, Zap, Target, Award, Crown, Footprints, Crosshair, Gem, Skull } from 'lucide-react';
import { saveScore, getLeaderboard } from '../services/leaderboardService';
import { playerService } from '../services/playerService';

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Progression State
  const [rank, setRank] = useState<RankInfo | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [careerProfit, setCareerProfit] = useState(0);

  // Refs to prevent double processing in StrictMode
  const processedRef = useRef(false);

  // Calculate totals
  const totalProfit = history.reduce((acc, curr) => acc + (curr.finalCapital - curr.initialCapital), 0);
  const totalReturn = (totalProfit / 500) * 100;
  
  const bestTrade = Math.max(...history.map(h => h.bestTradePct).filter(n => n !== -Infinity));
  const totalTrades = history.reduce((acc, curr) => acc + curr.tradeCount, 0);
  const totalWins = history.reduce((acc, curr) => acc + curr.winningTrades, 0);
  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

  const averageSP500Return = history.length > 0 
    ? history.reduce((acc, curr) => acc + curr.sp500ReturnPercent, 0) / history.length 
    : 0;

  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}$${Math.abs(Math.floor(val))}`;
  };

  const formatPct = (val: number) => {
    if (val === -Infinity || val === Infinity) return '0.0%';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${(val * 100).toFixed(1)}%`;
  };

  // Process Game Result & Progression ONCE
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    setLeaderboard(getLeaderboard());

    // Update Player Profile
    const { newProfile, newAchievements: unlocked, leveledUp } = playerService.updateProfile(history, totalProfit, totalReturn);
    
    const currentRank = playerService.getRank(newProfile.totalCareerProfit);
    
    setRank(currentRank);
    setCareerProfit(newProfile.totalCareerProfit);
    setNewAchievements(unlocked);
    setIsLevelUp(leveledUp);

    // Calculate Progress Bar
    if (currentRank.nextThreshold) {
      const prevThreshold = currentRank.minProfit;
      const totalRange = currentRank.nextThreshold - prevThreshold;
      const progress = newProfile.totalCareerProfit - prevThreshold;
      // Ensure percentage is between 0 and 100. If profit < minProfit (negative), 0.
      const pct = Math.max(0, Math.min(100, (progress / totalRange) * 100));
      setProgressPercent(pct);
    } else {
      setProgressPercent(100); // Max rank
    }

  }, [history, totalProfit, totalReturn]);

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    
    const newLeaderboard = saveScore(playerName, totalProfit, totalReturn);
    setLeaderboard(newLeaderboard);
    setIsSubmitted(true);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={16} className="text-yellow-400" />;
    if (index === 1) return <Medal size={16} className="text-slate-300" />;
    if (index === 2) return <Medal size={16} className="text-amber-600" />;
    return <span className="text-slate-500 text-sm font-mono">#{index + 1}</span>;
  };

  // Sharing
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `I just turned $500 into ${formatCurrency(totalProfit + 500)} in the Trading Simulator! 🚀\n\nProfit: ${formatCurrency(totalProfit)}\nReturn: ${formatPct(totalReturn/100)}\nRank: ${rank?.title}\n\nCan you beat my score?`;
  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };
  const shareOnLinkedin = () => {
    const linkedinText = `Just finished a session on Trading Simulator! 📉📈\n\nRank Achieved: ${rank?.title}\nSession Profit: ${formatCurrency(totalProfit)}\nTotal Return: ${formatPct(totalReturn/100)}\n\nChallenge your market instincts here: ${shareUrl}`;
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(linkedinText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-y-auto custom-scrollbar">
      
      <div className="p-6 pb-20"> {/* Padding bottom for fixed play button */}
        
        <div className="text-center mt-2 mb-6">
          <Trophy size={40} className="mx-auto text-yellow-500 mb-2" />
          <h1 className="text-3xl font-black text-white mb-1">SESSION COMPLETE</h1>
          <p className="text-slate-400 text-xs uppercase tracking-wider">Market closed</p>
        </div>

        {/* 1. Main Score Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 text-center mb-6 shadow-2xl">
          <span className="text-slate-400 text-xs font-bold uppercase block mb-1">Session Profit</span>
          <div className={`text-4xl font-black mb-1 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalProfit)}
          </div>
          <div className={`text-sm font-mono font-bold ${totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatPct(totalReturn / 100)} Return
          </div>
        </div>

        {/* 2. Progression Section (Gamification) */}
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

        {/* 3. New Achievements Unlocked */}
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

        {/* 4. Submit Score / Leaderboard Toggle */}
        {!isSubmitted ? (
          <div className="w-full max-w-md mx-auto mb-6">
            <form onSubmit={handleSubmitScore} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="text-slate-300 font-bold text-sm mb-3 flex items-center gap-2">
                <User size={16} className="text-blue-400" />
                Save to Daily Leaderboard
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={12}
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-bold text-sm"
                />
                <Button type="submit" disabled={!playerName.trim()} className="px-4 py-2 text-sm">
                  <Save size={18} />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto mb-6 animate-in fade-in">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                   <Trophy size={14} className="text-yellow-500" />
                   Top Traders
                 </h3>
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                {leaderboard.map((entry, idx) => {
                   const isCurrentRun = entry.timestamp === leaderboard.find(e => e.name === playerName && e.totalProfit === totalProfit)?.timestamp;
                   return (
                    <div 
                      key={idx} 
                      className={`flex justify-between items-center p-2 border-b border-slate-700/50 last:border-0 ${isCurrentRun ? 'bg-blue-900/30' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 flex justify-center">{getRankIcon(idx)}</div>
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

        {/* 5. Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6 max-w-md mx-auto w-full">
          <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Best Trade</span>
            <span className="text-xs font-bold text-emerald-400">{formatPct(bestTrade)}</span>
          </div>
          <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold block">Accuracy</span>
            <span className="text-xs font-bold text-blue-400">{winRate.toFixed(0)}%</span>
          </div>
          <div className="bg-slate-800 p-2 rounded border border-slate-700 text-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold block">vs Market</span>
            <span className={`text-xs font-bold ${averageSP500Return >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
              {formatPct(averageSP500Return / 100)}
            </span>
          </div>
        </div>

        {/* 6. Socials */}
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