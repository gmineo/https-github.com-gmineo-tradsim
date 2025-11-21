
import React from 'react';
import { Button } from './Button';
import { TrendingUp, Activity } from 'lucide-react';
import { audioService } from '../services/audioService';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  
  const handleStart = () => {
    audioService.init(); // Initialize AudioContext on user gesture
    onStart();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
        <Activity size={80} className="text-blue-400 relative z-10" />
      </div>
      
      <h1 className="text-4xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
        TRADING SIMULATOR
      </h1>
      
      <p className="text-slate-300 text-lg mb-12 max-w-md leading-relaxed">
        You have <b>$500</b>. <br/>
        Test your instincts on 3 mystery historical stocks.<br/>
        <span className="text-sm mt-4 block text-slate-400">
          Tap & Hold to BUY • Release to SELL
        </span>
      </p>

      <Button onClick={handleStart} fullWidth className="max-w-xs animate-pulse">
        START SESSION
      </Button>
    </div>
  );
};
