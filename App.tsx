import React, { useState, useCallback } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { TradingScreen } from './components/TradingScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { loadGameData } from './services/stockService';
import { GameState, TradeResult } from './types';
import { Button } from './components/Button';
import { AlertTriangle } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { GAME_CONFIG } from './constants';

export default function App() {
  const {
    gameState,
    stocks,
    currentIndex,
    capital,
    initialCapitalForCurrentStock,
    history,
    lastResult,
    setGameState,
    setStocks,
    setCapital,
    setInitialCapitalForCurrentStock,
    addToHistory,
    setLastResult,
    resetGame,
    moveToNextStock,
  } = useGameState();

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const startGame = async (rounds: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const newStocks = await loadGameData(rounds);
      
      if (newStocks.length === 0) {
        setLoadError("Could not load market data. If you are on Netlify, ensure 'coke.csv', 'btc.csv', and 'aapl.csv' are inside a 'public' folder.");
        setIsLoading(false);
        return;
      }
      
      setStocks(newStocks);
      resetGame();
      setGameState(GameState.TRADING);
    } catch (e) {
      console.error(e);
      setLoadError("Network error or missing files.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockComplete = useCallback((
    finalCapital: number,
    stats: { tradeCount: number; winningTrades: number; bestTradePct: number; worstTradePct: number }
  ) => {
    // Prevent double execution if state is already updating
    if (gameState === GameState.ANALYSIS) return;
    
    const currentStock = stocks[currentIndex];
    
    // Guard clause: Ensure data exists before accessing
    if (!currentStock?.data || currentStock.data.length === 0) {
      console.error("Missing stock data at index", currentIndex);
      setGameState(GameState.ANALYSIS);
      return;
    }

    const firstPrice = currentStock.data[0].price;
    const lastPrice = currentStock.data[currentStock.data.length - 1].price;
    const sp500Start = currentStock.data[0].sp500;
    const sp500End = currentStock.data[currentStock.data.length - 1].sp500;

    const result: TradeResult = {
      stockName: currentStock.name,
      ticker: currentStock.ticker,
      initialCapital: initialCapitalForCurrentStock,
      finalCapital: finalCapital,
      userReturnPercent: ((finalCapital - initialCapitalForCurrentStock) / initialCapitalForCurrentStock) * 100,
      stockReturnPercent: ((lastPrice - firstPrice) / firstPrice) * 100,
      sp500ReturnPercent: ((sp500End - sp500Start) / sp500Start) * 100,
      sp500Start,
      sp500End,
      tradeCount: stats.tradeCount,
      winningTrades: stats.winningTrades,
      bestTradePct: stats.bestTradePct,
      worstTradePct: stats.worstTradePct,
    };

    addToHistory(result);
    setGameState(GameState.ANALYSIS);
  }, [gameState, stocks, currentIndex, initialCapitalForCurrentStock, addToHistory, setGameState]);

  const handleNextStock = () => {
    moveToNextStock();
  };

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {loadError ? (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Data Load Error</h2>
          <p className="text-slate-400 mb-8 max-w-md">{loadError}</p>
          <Button onClick={() => startGame(3)}>RETRY</Button>
        </div>
      ) : (
        <>
          {gameState === GameState.INTRO && (
            <IntroScreen 
              onStart={startGame} 
              isLoading={isLoading}
            />
          )}

          {/* Render TradingScreen for both TRADING and ANALYSIS states to keep chart in background */}
          {(gameState === GameState.TRADING || gameState === GameState.ANALYSIS) && stocks[currentIndex] && stocks[currentIndex].data && stocks[currentIndex].data.length > 0 && (
            <TradingScreen 
              stock={stocks[currentIndex]} 
              currentCapital={capital}
              onComplete={handleStockComplete}
            />
          )}

          {gameState === GameState.ANALYSIS && lastResult && stocks[currentIndex] && (
            <AnalysisScreen 
              result={lastResult} 
              stock={stocks[currentIndex]}
              onNext={handleNextStock} 
            />
          )}

          {gameState === GameState.GAMEOVER && (
            <GameOverScreen 
              history={history} 
              onRestart={() => {
                setGameState(GameState.INTRO);
                resetGame();
              }} 
            />
          )}
        </>
      )}
    </div>
  );
}