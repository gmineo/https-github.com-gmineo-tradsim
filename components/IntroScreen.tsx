
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Activity, Loader2, Trophy, Medal, Sliders } from 'lucide-react';
import { audioService } from '../services/audioService';
import { getCombinedLeaderboard } from '../services/leaderboardService';
import { LeaderboardEntry } from '../types';
import { GAME_CONFIG } from '../constants';

interface IntroScreenProps {
  onStart: (rounds: number) => void;
  isLoading?: boolean;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart, isLoading = false }) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);
  const [roundCount, setRoundCount] = useState(GAME_CONFIG.DEFAULT_ROUNDS);

  useEffect(() => {
    const fetchLb = async () => {
      try {
        const data = await getCombinedLeaderboard();
        setTopPlayers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLb(false);
      }
    };
    fetchLb();
  }, []);
  
  const handleStart = () => {
    audioService.init(); // Initialize AudioContext on user gesture
    onStart(roundCount);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={14} className="text-yellow-400" />;
    if (index === 1) return <Medal size={14} className="text-slate-300" />;
    if (index === 2) return <Medal size={14} className="text-amber-600" />;
    return <span className="text-slate-500 text-xs font-mono w-3.5 text-center">{index + 1}</span>;
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center overflow-y-auto custom-scrollbar">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
          <Activity size={80} className="text-blue-400 relative z-10" />
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          TRADING SIMULATOR
        </h1>
        
        <p className="text-slate-300 text-lg mb-6 max-w-md leading-relaxed">
          You have <b>$500</b> per trade. <br/>
          Test your instincts against historical data.
        </p>

        {/* GAME SETTINGS */}
        <div className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
              <Sliders size={16} />
              MARKETS TO TRADE
            </div>
            <span className="text-2xl font-black text-blue-400">{roundCount}</span>
          </div>
          <input 
            type="range" 
            min={GAME_CONFIG.MIN_ROUNDS} 
            max={GAME_CONFIG.MAX_ROUNDS} 
            value={roundCount} 
            onChange={(e) => setRoundCount(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
            <span>QUICK</span>
            <span>MARATHON</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs mb-10">
          <Button onClick={handleStart} fullWidth className="animate-pulse" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} /> LOADING MARKETS...
              </span>
            ) : (
              "START CAREER MODE"
            )}
          </Button>
          <p className="text-[10px] text-slate-500">
            Data: Real Historical CSVs (Randomized)
          </p>
        </div>

        {/* GLOBAL LEADERBOARD PREVIEW */}
        <div className="w-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden max-w-xs min-h-[160px]">
          <div className="bg-slate-800/80 p-2 border-b border-slate-700/50 flex justify-center items-center gap-2">
            <Trophy size={14} className="text-yellow-500" />
            <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              Global Leaderboard
            </span>
          </div>
          
          {loadingLb ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-slate-600" size={24} />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {topPlayers.map((player, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {getRankIcon(idx)}
                    <span className="font-bold text-slate-300 truncate max-w-[100px]">{player.name}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    ${Math.floor(player.totalProfit)}
                  </span>
                </div>
              ))}
              {topPlayers.length === 0 && (
                 <div className="text-xs text-slate-500 text-center py-4">No scores yet</div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
