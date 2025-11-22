import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AreaChart, Area, YAxis, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { StockData } from '../types';
import { audioService } from '../services/audioService';
import { TrendingUp } from 'lucide-react';

interface TradingScreenProps {
  stock: StockData;
  currentCapital: number;
  onComplete: (finalCapital: number, tradeCount: number, winningTrades: number, bestTrade: number, worstTrade: number) => void;
}

interface Point {
  date: string;
  price: number;
  index: number;
}

interface TradeSegment {
  start: Point;
  end: Point;
  pnlPercent: number;
}

// Helper for Haptics
const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

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
  // Game State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [liveCapital, setLiveCapital] = useState(currentCapital);
  
  // Visual Feedback State
  const [shakeClass, setShakeClass] = useState('');
  const [popEffect, setPopEffect] = useState<{show: boolean, text: string, color: string} | null>(null);
  
  // Visual Trade History State
  const [completedTrades, setCompletedTrades] = useState<TradeSegment[]>([]);
  const [tradeStartPoint, setTradeStartPoint] = useState<Point | null>(null);
  
  // Stats tracking
  const [tradeCount, setTradeCount] = useState(0);
  const [winningTrades, setWinningTrades] = useState(0);
  const [bestTradePct, setBestTradePct] = useState(-Infinity);
  const [worstTradePct, setWorstTradePct] = useState(Infinity);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const capitalRef = useRef(currentCapital);

  // Constants
  const GAME_SPEED_MS = 80;
  const INITIAL_VISIBLE_POINTS = 20;

  useEffect(() => {
    setCurrentIndex(INITIAL_VISIBLE_POINTS - 1);
    capitalRef.current = currentCapital;
    setLiveCapital(currentCapital);
    setCompletedTrades([]);
    setTradeStartPoint(null);
    setIsHolding(false);
    setEntryPrice(null);
    
    return () => {
      stopGameLoop();
      audioService.stopTension();
    };
  }, [stock]);

  const stopGameLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleGameEnd = useCallback(() => {
    stopGameLoop();
    audioService.stopTension();
    
    let finalCap = capitalRef.current;
    let bTrade = bestTradePct;
    let wTrade = worstTradePct;
    let tCount = tradeCount;
    let wCount = winningTrades;

    // Force close any open position
    if (isHolding && entryPrice !== null) {
      const lastPrice = stock.data[stock.data.length - 1].price;
      const pnlPercent = (lastPrice - entryPrice) / entryPrice;
      finalCap = capitalRef.current * (1 + pnlPercent);
      
      tCount++;
      if (pnlPercent > 0) wCount++;
      bTrade = Math.max(bTrade, pnlPercent);
      wTrade = Math.min(wTrade, pnlPercent);
    }

    onComplete(finalCap, tCount, wCount, bTrade, wTrade);
  }, [isHolding, entryPrice, stock.data, onComplete, bestTradePct, worstTradePct, tradeCount, winningTrades]);

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

        const currentPrice = stock.data[next].price;

        // AUDIO: Tick Sound
        audioService.playTick();

        // Update Capital & Haptics during trade
        if (isHolding && entryPrice !== null) {
          const pnlPercent = (currentPrice - entryPrice) / entryPrice;
          setLiveCapital(capitalRef.current * (1 + pnlPercent));

          // Haptic feedback on significant moves
          const prevPrice = stock.data[prev].price;
          if (Math.abs(currentPrice - prevPrice) / prevPrice > 0.01) {
             vibrate(10); 
          }
        } else {
          setLiveCapital(capitalRef.current);
        }

        return next;
      });
    }, GAME_SPEED_MS);

    return () => stopGameLoop();
  }, [stock.data, isHolding, entryPrice, handleGameEnd]);

  // Interaction Handlers
  const startTrade = () => {
    if (currentIndex >= stock.data.length - 1) return;
    if (isHolding) return;

    const currentDataPoint = stock.data[currentIndex];
    const currentPrice = currentDataPoint.price;
    
    setIsHolding(true);
    setEntryPrice(currentPrice);
    
    setTradeStartPoint({
      date: currentDataPoint.date,
      price: currentPrice,
      index: currentIndex
    });

    // JUICE: Sound + Haptic
    audioService.startTension();
    vibrate(50);
  };

  const endTrade = () => {
    if (!isHolding || entryPrice === null) return;

    const currentDataPoint = stock.data[currentIndex];
    const currentPrice = currentDataPoint.price;
    
    const pnlPercent = (currentPrice - entryPrice) / entryPrice;
    const newCapital = capitalRef.current * (1 + pnlPercent);
    const profitAmt = newCapital - capitalRef.current;

    // JUICE: Stop Tension
    audioService.stopTension();

    // JUICE: Result Feedback
    if (pnlPercent > 0) {
        audioService.playWin();
        vibrate([50, 50, 50]); 
        setPopEffect({ show: true, text: `+$${Math.floor(profitAmt)}`, color: 'text-emerald-400' });
        if (pnlPercent > 0.1) setShakeClass('animate-shake-green');
    } else {
        audioService.playLoss();
        vibrate(200); 
        setPopEffect({ show: true, text: `-$${Math.abs(Math.floor(profitAmt))}`, color: 'text-red-500' });
        if (pnlPercent < -0.1) setShakeClass('animate-shake-red');
    }

    setTimeout(() => setShakeClass(''), 500);
    setTimeout(() => setPopEffect(null), 1000);

    // Update State
    capitalRef.current = newCapital;
    setLiveCapital(newCapital);
    
    if (tradeStartPoint) {
      setCompletedTrades(prev => [...prev, {
        start: tradeStartPoint,
        end: {
          date: currentDataPoint.date,
          price: currentPrice,
          index: currentIndex
        },
        pnlPercent: pnlPercent
      }]);
    }

    setIsHolding(false);
    setEntryPrice(null);
    setTradeStartPoint(null);

    setTradeCount(prev => prev + 1);
    if (pnlPercent > 0) setWinningTrades(prev => prev + 1);
    setBestTradePct(prev => Math.max(prev, pnlPercent));
    setWorstTradePct(prev => Math.min(prev, pnlPercent));
  };

  // Handlers for buttons
  const handleMouseDown = () => startTrade();
  const handleMouseUp = () => endTrade();

  // Memoized Chart Data
  const chartData = useMemo(() => {
    return stock.data.map((point, index) => ({
      ...point,
      displayPrice: index <= currentIndex ? point.price : null
    }));
  }, [stock.data, currentIndex]);

  // Current PnL for UI
  const unrealizedPnL = isHolding 
    ? liveCapital - capitalRef.current
    : 0;
  
  // JUICE: Dynamic Border
  let borderClass = "border-slate-900"; 
  if (isHolding) {
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
            {completedTrades.map((trade, idx) => (
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
            {isHolding && tradeStartPoint && (
              <ReferenceLine
                segment={[
                  { x: tradeStartPoint.date, y: tradeStartPoint.price },
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
            <span className="text-2xl font-mono font-bold text-white">${Math.floor(liveCapital).toLocaleString()}</span>
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
          className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${isHolding ? 'bg-emerald-600 text-white' : 'text-emerald-500 hover:bg-emerald-900/20'}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
            <TrendingUp size={32} className={isHolding ? 'animate-bounce' : ''} />
            <span className="font-black tracking-widest text-lg">{isHolding ? 'RELEASE TO SELL' : 'HOLD TO BUY'}</span>
        </button>
      </div>
    </div>
  );
};