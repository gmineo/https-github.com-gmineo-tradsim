import { useState, useCallback } from 'react';
import { GameState, StockData, TradeResult } from '../types';
import { GAME_CONFIG } from '../constants';

interface UseGameStateReturn {
  gameState: GameState;
  stocks: StockData[];
  currentIndex: number;
  capital: number;
  initialCapitalForCurrentStock: number;
  history: TradeResult[];
  lastResult: TradeResult | null;
  setGameState: (state: GameState) => void;
  setStocks: (stocks: StockData[]) => void;
  setCurrentIndex: (index: number) => void;
  setCapital: (capital: number) => void;
  setInitialCapitalForCurrentStock: (capital: number) => void;
  addToHistory: (result: TradeResult) => void;
  setLastResult: (result: TradeResult | null) => void;
  resetGame: () => void;
  moveToNextStock: () => boolean; // Returns true if there are more stocks
}

export const useGameState = (): UseGameStateReturn => {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [capital, setCapital] = useState(GAME_CONFIG.INITIAL_CAPITAL);
  const [initialCapitalForCurrentStock, setInitialCapitalForCurrentStock] = useState(
    GAME_CONFIG.INITIAL_CAPITAL
  );
  const [history, setHistory] = useState<TradeResult[]>([]);
  const [lastResult, setLastResult] = useState<TradeResult | null>(null);

  const addToHistory = useCallback((result: TradeResult) => {
    setHistory(prev => [...prev, result]);
    setLastResult(result);
  }, []);

  const resetGame = useCallback(() => {
    setCapital(GAME_CONFIG.INITIAL_CAPITAL);
    setCurrentIndex(0);
    setHistory([]);
    setInitialCapitalForCurrentStock(GAME_CONFIG.INITIAL_CAPITAL);
    setLastResult(null);
  }, []);

  const moveToNextStock = useCallback((): boolean => {
    if (currentIndex < stocks.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCapital(GAME_CONFIG.INITIAL_CAPITAL);
      setInitialCapitalForCurrentStock(GAME_CONFIG.INITIAL_CAPITAL);
      setGameState(GameState.TRADING);
      return true;
    } else {
      setGameState(GameState.GAMEOVER);
      return false;
    }
  }, [currentIndex, stocks.length]);

  return {
    gameState,
    stocks,
    currentIndex,
    capital,
    initialCapitalForCurrentStock,
    history,
    lastResult,
    setGameState,
    setStocks,
    setCurrentIndex,
    setCapital,
    setInitialCapitalForCurrentStock,
    addToHistory,
    setLastResult,
    resetGame,
    moveToNextStock,
  };
};

