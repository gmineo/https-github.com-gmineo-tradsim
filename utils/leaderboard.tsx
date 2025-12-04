/**
 * Utility components and functions for leaderboard display
 */

import React from 'react';
import { Trophy, Medal } from 'lucide-react';

/**
 * Returns the appropriate icon/display for a leaderboard rank position
 */
export const getRankIcon = (index: number): React.ReactNode => {
  if (index === 0) return <Trophy size={14} className="text-yellow-400" />;
  if (index === 1) return <Medal size={14} className="text-slate-300" />;
  if (index === 2) return <Medal size={14} className="text-amber-600" />;
  return <span className="text-slate-500 text-xs font-mono w-3.5 text-center">{index + 1}</span>;
};

/**
 * Returns the appropriate icon/display for a leaderboard rank position (larger size)
 */
export const getRankIconLarge = (index: number): React.ReactNode => {
  if (index === 0) return <Trophy size={16} className="text-yellow-400" />;
  if (index === 1) return <Medal size={16} className="text-slate-300" />;
  if (index === 2) return <Medal size={16} className="text-amber-600" />;
  return <span className="text-slate-500 text-sm font-mono">#{index + 1}</span>;
};

