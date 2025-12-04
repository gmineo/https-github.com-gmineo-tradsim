import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AreaChart, Area, YAxis, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { StockData } from '../types';
import { audioService } from '../services/audioService';
import { TrendingUp } from 'lucide-react';
import { useTrading } from '../hooks/useTrading';
import { GAME_CONFIG, TRADING_CONFIG } from '../constants';

interface TradingScreenProps {
  stock: StockData;
  currentCapital: number;
  onComplete: (finalCapital: number, stats: { tradeCount: number; winningTrades: number; bestTradePct: number; worstTradePct: number }) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.displayPrice === null) return null;
    
    return (
      <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-lg z-50">
        <p className="text-slate-300 text-xs mb-1">{data.date}</p>
        <p className="text-white font-mono font-bold">${data.price.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export const TradingScreen: React.FC<TradingScreenProps> = ({ stock, currentCapital, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shakeClass, setShakeClass] = useState('');
  const [popEffect, setPopEffect] = useState<{show: boolean, text: string, color: string} | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trading = useTrading(currentCapital);

  useEffect(() => {
    setCurrentIndex(GAME_CONFIG.INITIAL_VISIBLE_POINTS - 1);
    trading.reset(currentCapital);
    
    return () => {
      stopGameLoop();
      audioService.stopTension();
    };
  }, [stock, currentCapital, trading]);

  const stopGameLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleGameEnd = useCallback(() => {
    stopGameLoop();
    audioService.stopTension();
    
    const stats = trading.getFinalStats();
    let finalCap = trading.liveCapital;

    // Force close any open position
    if (trading.isHolding && trading.entryPrice !== null) {
      const lastPrice = stock.data[stock.data.length - 1].price;
      const pnlPercent = (lastPrice - trading.entryPrice) / trading.entryPrice;
      finalCap = trading.liveCapital * (1 + pnlPercent);
      
      const newStats = {
        tradeCount: stats.tradeCount + 1,
        winningTrades: pnlPercent > 0 ? stats.winningTrades + 1 : stats.winningTrades,
        bestTradePct: Math.max(stats.bestTradePct, pnlPercent),
        worstTradePct: Math.min(stats.worstTradePct, pnlPercent),
      };
      onComplete(finalCap, newStats);
    } else {
      onComplete(finalCap, stats);
    }
  }, [stock.data, onComplete, trading]);

  // Game Loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        
        if (next >= stock.data.length) {
          handleGameEnd();
          return prev;
        }

        // AUDIO: Tick Sound
        audioService.playTick();

        // Update Capital & Haptics during trade
        trading.updateLiveCapital(next, stock);

        return next;
      });
    }, GAME_CONFIG.GAME_SPEED_MS);

    return () => stopGameLoop();
  }, [stock.data, handleGameEnd, trading]);

  // Interaction Handlers
  const handleStartTrade = () => {
    if (currentIndex >= stock.data.length - 1) return;
    trading.startTrade(currentIndex, stock);
  };

  const handleEndTrade = () => {
    trading.endTrade(currentIndex, stock, (finalCapital, stats) => {
      const profitAmt = finalCapital - trading.getBaseCapital();
      const pnlPercent = stats.bestTradePct > -Infinity ? stats.bestTradePct : 0;

      // Visual feedback
      if (pnlPercent > 0) {
        setPopEffect({ show: true, text: `+$${Math.floor(profitAmt)}`, color: 'text-emerald-400' });
        if (pnlPercent > TRADING_CONFIG.SHAKE_THRESHOLD) setShakeClass('animate-shake-green');
      } else {
        setPopEffect({ show: true, text: `-$${Math.abs(Math.floor(profitAmt))}`, color: 'text-red-500' });
        if (pnlPercent < -TRADING_CONFIG.SHAKE_THRESHOLD) setShakeClass('animate-shake-red');
      }

      setTimeout(() => setShakeClass(''), TRADING_CONFIG.SHAKE_DURATION);
      setTimeout(() => setPopEffect(null), TRADING_CONFIG.POP_EFFECT_DURATION);
    });
  };

  // Handlers for buttons
  const handleMouseDown = () => handleStartTrade();
  const handleMouseUp = () => handleEndTrade();

  // Memoized Chart Data
  const chartData = useMemo(() => {
    return stock.data.map((point, index) => ({
      ...point,
      displayPrice: index <= currentIndex ? point.price : null
    }));
  }, [stock.data, currentIndex]);

  // Current PnL for UI
  const unrealizedPnL = trading.isHolding 
    ? trading.liveCapital - trading.getBaseCapital()
    : 0;
  
  // JUICE: Dynamic Border
  let borderClass = "border-slate-900"; 
  if (trading.isHolding) {
    if (unrealizedPnL > 0) borderClass = "border-emerald-500/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]";
    else if (unrealizedPnL < 0) borderClass = "border-red-500/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]";
  }

  return (
    <div 
      className={`h-screen w-full flex flex-col bg-slate-900 select-none border-4 transition-colors duration-300 ${borderClass} ${shakeClass}`}
      ref={containerRef}
      style={{ touchAction: 'none' }}
    >
      {/* Pop Effect Overlay */}
      {popEffect && popEffect.show && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <h1 className={`text-6xl font-black ${popEffect.color} animate-money-pop drop-shadow-lg`}>
                  {popEffect.text}
              </h1>
          </div>
      )}

      {/* Top Bar */}
      <div className="pt-6 px-6 relative flex items-center justify-center z-10 w-full">
        {/* Centered Mystery Stock Title */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Mystery Stock</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono text-slate-200">???</span>
          </div>
        </div>
        
        {/* Right Aligned Date - using absolute positioning to keep title centered */}
        <div className="absolute right-6 top-6 flex flex-col items-end">
           <span className="text-xs font-bold text-slate-400 uppercase">Date</span>
           <span className="text-lg text-slate-300 font-mono">{stock.data[currentIndex]?.date}</span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 w-full relative my-4 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="date" 
              stroke="#475569" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              stroke="#475569" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(val) => `$${val.toFixed(0)}`}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
              isAnimationActive={false}
            />
            
            <Area 
              type="natural" 
              dataKey="displayPrice" 
              stroke="#3B82F6" 
              strokeWidth={4}
              fill="url(#colorPrice)" 
              isAnimationActive={false} 
              connectNulls={false}
            />

            {/* Render Previous Trades */}
            {trading.completedTrades.map((trade, idx) => (
              <ReferenceLine
                key={`trade-${idx}`}
                segment={[
                  { x: trade.start.date, y: trade.start.price },
                  { x: trade.end.date, y: trade.end.price }
                ]}
                stroke={trade.pnlPercent >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={4}
              />
            ))}

            {/* Render Current Trade */}
            {trading.isHolding && trading.tradeStartPoint && (
              <ReferenceLine
                segment={[
                  { x: trading.tradeStartPoint.date, y: trading.tradeStartPoint.price },
                  { x: stock.data[currentIndex].date, y: stock.data[currentIndex].price }
                ]}
                stroke={unrealizedPnL >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={4}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status Bar */}
      <div className="px-6 mb-2 flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold uppercase">Equity</span>
            <span className="text-2xl font-mono font-bold text-white">${Math.floor(trading.liveCapital).toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-bold uppercase">Unrealized P&L</span>
            <span className={`text-2xl font-mono font-bold transition-all ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} ${Math.abs(unrealizedPnL) > 50 ? 'scale-110' : ''}`}>
              {unrealizedPnL >= 0 ? '+' : ''}${Math.floor(unrealizedPnL)}
            </span>
          </div>
      </div>

      {/* CONTROLS: Single Giant Button */}
      <div className="h-24 bg-slate-800 border-t border-slate-700">
        <button
          className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${trading.isHolding ? 'bg-emerald-600 text-white' : 'text-emerald-500 hover:bg-emerald-900/20'}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
            <TrendingUp size={32} className={trading.isHolding ? 'animate-bounce' : ''} />
            <span className="font-black tracking-widest text-lg">{trading.isHolding ? 'RELEASE TO SELL' : 'HOLD TO BUY'}</span>
        </button>
      </div>
    </div>
  );
};