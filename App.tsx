import React, { useState, useCallback } from 'react';
import { IntroScreen } from './components/IntroScreen';
import { TradingScreen } from './components/TradingScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { generateSessionStocks } from './services/stockService';
import { GameState, StockData, TradeResult } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Global Capital State
  const [capital, setCapital] = useState(500);
  const [initialCapitalForCurrentStock, setInitialCapitalForCurrentStock] = useState(500);
  
  // History for Game Over
  const [history, setHistory] = useState<TradeResult[]>([]);

  // Temporary result holder for the Analysis Screen
  const [lastResult, setLastResult] = useState<TradeResult | null>(null);

  const startGame = () => {
    const newStocks = generateSessionStocks();
    setStocks(newStocks);
    setCapital(500);
    setCurrentIndex(0);
    setHistory([]);
    setGameState(GameState.TRADING);
    setInitialCapitalForCurrentStock(500);
  };

  const handleStockComplete = useCallback((
    finalCapital: number, 
    tradeCount: number, 
    winningTrades: number, 
    bestTrade: number, 
    worstTrade: number
  ) => {
    // Prevent double execution if state is already updating
    setGameState(current => {
      if (current === GameState.ANALYSIS) return current;
      
      const currentStock = stocks[currentIndex];
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
        tradeCount,
        winningTrades,
        bestTradePct: bestTrade,
        worstTradePct: worstTrade
      };

      setLastResult(result);
      setHistory(prev => [...prev, result]);
      
      return GameState.ANALYSIS;
    });
  }, [stocks, currentIndex, initialCapitalForCurrentStock]);

  const handleNextStock = () => {
    if (currentIndex < stocks.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCapital(500); // Reset capital to 500 for the new stock
      setInitialCapitalForCurrentStock(500);
      setGameState(GameState.TRADING);
    } else {
      setGameState(GameState.GAMEOVER);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {gameState === GameState.INTRO && (
        <IntroScreen onStart={startGame} />
      )}

      {/* Render TradingScreen for both TRADING and ANALYSIS states to keep chart in background */}
      {(gameState === GameState.TRADING || gameState === GameState.ANALYSIS) && stocks[currentIndex] && (
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
          onRestart={startGame} 
        />
      )}
    </div>
  );
}