import { useState, useRef, useCallback } from 'react';
import { StockData } from '../types';
import { calculatePnLPercent, calculateNewCapital } from '../utils/calculations';
import { audioService } from '../services/audioService';
import { HAPTIC_PATTERNS, TRADING_CONFIG } from '../constants';

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

interface TradingStats {
  tradeCount: number;
  winningTrades: number;
  bestTradePct: number;
  worstTradePct: number;
}

interface UseTradingReturn {
  isHolding: boolean;
  entryPrice: number | null;
  liveCapital: number;
  completedTrades: TradeSegment[];
  tradeStartPoint: Point | null;
  stats: TradingStats;
  startTrade: (currentIndex: number, stock: StockData, currentCapital: number) => void;
  endTrade: (
    currentIndex: number,
    stock: StockData,
    onComplete: (finalCapital: number, stats: TradingStats) => void
  ) => void;
  updateLiveCapital: (currentIndex: number, stock: StockData, currentCapital: number) => void;
  reset: (initialCapital: number) => void;
  getFinalStats: () => TradingStats;
}

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const useTrading = (initialCapital: number): UseTradingReturn => {
  const [isHolding, setIsHolding] = useState(false);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [liveCapital, setLiveCapital] = useState(initialCapital);
  const [completedTrades, setCompletedTrades] = useState<TradeSegment[]>([]);
  const [tradeStartPoint, setTradeStartPoint] = useState<Point | null>(null);
  
  const [tradeCount, setTradeCount] = useState(0);
  const [winningTrades, setWinningTrades] = useState(0);
  const [bestTradePct, setBestTradePct] = useState(-Infinity);
  const [worstTradePct, setWorstTradePct] = useState(Infinity);

  const capitalRef = useRef(initialCapital);

  const startTrade = useCallback((currentIndex: number, stock: StockData) => {
    if (currentIndex >= stock.data.length - 1 || isHolding) return;

    const currentDataPoint = stock.data[currentIndex];
    const currentPrice = currentDataPoint.price;
    
    setIsHolding(true);
    setEntryPrice(currentPrice);
    
    setTradeStartPoint({
      date: currentDataPoint.date,
      price: currentPrice,
      index: currentIndex
    });

    audioService.startTension();
    vibrate(HAPTIC_PATTERNS.TRADE_START);
  }, [isHolding]);

  const endTrade = useCallback((
    currentIndex: number,
    stock: StockData,
    onComplete: (finalCapital: number, stats: TradingStats) => void
  ) => {
    if (!isHolding || entryPrice === null) return;

    const currentDataPoint = stock.data[currentIndex];
    const currentPrice = currentDataPoint.price;
    
    const pnlPercent = calculatePnLPercent(entryPrice, currentPrice);
    const newCapital = calculateNewCapital(capitalRef.current, pnlPercent);
    const profitAmt = newCapital - capitalRef.current;

    audioService.stopTension();

    if (pnlPercent > 0) {
      audioService.playWin();
      vibrate(HAPTIC_PATTERNS.TRADE_END_WIN);
    } else {
      audioService.playLoss();
      vibrate(HAPTIC_PATTERNS.TRADE_END_LOSS);
    }

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

    const newTradeCount = tradeCount + 1;
    const newWinningTrades = pnlPercent > 0 ? winningTrades + 1 : winningTrades;
    const newBestTrade = Math.max(bestTradePct, pnlPercent);
    const newWorstTrade = Math.min(worstTradePct, pnlPercent);

    setTradeCount(newTradeCount);
    if (pnlPercent > 0) setWinningTrades(newWinningTrades);
    setBestTradePct(newBestTrade);
    setWorstTradePct(newWorstTrade);

    onComplete(newCapital, {
      tradeCount: newTradeCount,
      winningTrades: newWinningTrades,
      bestTradePct: newBestTrade,
      worstTradePct: newWorstTrade,
    });
  }, [isHolding, entryPrice, tradeStartPoint, tradeCount, winningTrades, bestTradePct, worstTradePct]);

  const updateLiveCapital = useCallback((currentIndex: number, stock: StockData) => {
    if (isHolding && entryPrice !== null) {
      const currentPrice = stock.data[currentIndex].price;
      const pnlPercent = calculatePnLPercent(entryPrice, currentPrice);
      setLiveCapital(calculateNewCapital(capitalRef.current, pnlPercent));

      // Haptic feedback on significant moves
      if (currentIndex > 0) {
        const prevPrice = stock.data[currentIndex - 1].price;
        if (Math.abs(currentPrice - prevPrice) / prevPrice > TRADING_CONFIG.SIGNIFICANT_MOVE_THRESHOLD) {
          vibrate(HAPTIC_PATTERNS.TICK);
        }
      }
    } else {
      setLiveCapital(capitalRef.current);
    }
  }, [isHolding, entryPrice]);

  const reset = useCallback((initialCapital: number) => {
    capitalRef.current = initialCapital;
    setLiveCapital(initialCapital);
    setCompletedTrades([]);
    setTradeStartPoint(null);
    setIsHolding(false);
    setEntryPrice(null);
    setTradeCount(0);
    setWinningTrades(0);
    setBestTradePct(-Infinity);
    setWorstTradePct(Infinity);
  }, []);

  const getFinalStats = useCallback((): TradingStats => {
    return {
      tradeCount,
      winningTrades,
      bestTradePct,
      worstTradePct,
    };
  }, [tradeCount, winningTrades, bestTradePct, worstTradePct]);

  const getBaseCapital = useCallback(() => capitalRef.current, []);

  return {
    isHolding,
    entryPrice,
    liveCapital,
    completedTrades,
    tradeStartPoint,
    stats: {
      tradeCount,
      winningTrades,
      bestTradePct,
      worstTradePct,
    },
    startTrade,
    endTrade,
    updateLiveCapital,
    reset,
    getFinalStats,
    getBaseCapital,
  };
};

