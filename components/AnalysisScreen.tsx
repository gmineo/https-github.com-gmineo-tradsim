import React from 'react';
import { StockData, TradeResult } from '../types';
import { Button } from './Button';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalysisScreenProps {
  result: TradeResult;
  onNext: () => void;
  stock: StockData;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ result, onNext, stock }) => {
  
  const formatPct = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  const formatCurrency = (val: number) => `$${Math.floor(val)}`;

  const getColor = (val: number) => val >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-300">
      
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header Section - Minimal Dark Style */}
        <div className="pt-8 pb-4 px-6 text-center flex flex-col items-center bg-slate-900">
          <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">IT WAS</h2>
          <h1 className="text-3xl font-black text-white mb-1 tracking-tight leading-none">{result.stockName}</h1>
          <div className="text-blue-500 font-bold text-lg mb-4">{result.ticker}</div>
          
          <div className="bg-slate-800 px-3 py-1 rounded text-slate-400 text-xs font-mono inline-flex items-center gap-2">
             <span>{stock.periodStart}</span>
             <span className="text-slate-600">→</span>
             <span>{stock.periodEnd}</span>
          </div>
        </div>

        {/* Stats Body */}
        <div className="px-6 pb-6 space-y-3 bg-slate-900">
          
          {/* User Trading Result Card */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 relative">
             <div className="flex justify-between items-start mb-1">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">YOUR TRADING</span>
                {result.userReturnPercent >= 0 
                  ? <ArrowUpRight size={20} className="text-emerald-400"/> 
                  : <ArrowDownRight size={20} className="text-red-400"/>
                }
             </div>
             
             <div className={`text-5xl font-black mb-4 mt-1 ${getColor(result.userReturnPercent)}`}>
                {formatPct(result.userReturnPercent)}
             </div>
             
             <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                 <div>Start: <span className="text-slate-200">{formatCurrency(result.initialCapital)}</span></div>
                 <div>End: <span className="text-slate-200">{formatCurrency(result.finalCapital)}</span></div>
             </div>
          </div>

          {/* Stock B&H Card */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">BUY & HOLD ({result.ticker})</span>
              <div className={`text-2xl font-black ${getColor(result.stockReturnPercent)}`}>
                {formatPct(result.stockReturnPercent)}
              </div>
            </div>
          </div>

          {/* S&P 500 B&H Card */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">BUY & HOLD (S&P 500)</span>
                <div className={`text-2xl font-black ${getColor(result.sp500ReturnPercent)}`}>
                  {formatPct(result.sp500ReturnPercent)}
                </div>
             </div>
             <div className="text-right text-xs font-mono text-slate-500 flex flex-col justify-center gap-1">
                 <div>Start: <span className="text-slate-300">{result.sp500Start.toFixed(0)}</span></div>
                 <div>End: <span className="text-slate-300">{result.sp500End.toFixed(0)}</span></div>
             </div>
          </div>

        </div>

        {/* Footer Button */}
        <div className="p-6 pt-0 bg-slate-900">
          <Button onClick={onNext} fullWidth className="rounded-xl py-4 text-base font-black tracking-wide bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20">
            CONTINUE
          </Button>
        </div>

      </div>
    </div>
  );
};