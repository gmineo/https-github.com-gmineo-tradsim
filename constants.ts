/**
 * Game Configuration Constants
 */

export const GAME_CONFIG = {
  INITIAL_CAPITAL: 500,
  GAME_SPEED_MS: 80,
  INITIAL_VISIBLE_POINTS: 20,
  MAX_DATA_POINTS: 450,
  MIN_ROUNDS: 1,
  MAX_ROUNDS: 10,
  DEFAULT_ROUNDS: 3,
} as const;

export const TRADING_CONFIG = {
  SIGNIFICANT_MOVE_THRESHOLD: 0.01, // 1% price change for haptic feedback
  SHAKE_THRESHOLD: 0.1, // 10% for shake animation
  POP_EFFECT_DURATION: 1000,
  SHAKE_DURATION: 500,
} as const;

export const HAPTIC_PATTERNS = {
  TICK: 10,
  TRADE_START: 50,
  TRADE_END_WIN: [50, 50, 50] as number[],
  TRADE_END_LOSS: 200,
} as const;

export const LEADERBOARD_CONFIG = {
  STORAGE_KEY: 'trading_simulator_leaderboard',
  MAX_LOCAL_ENTRIES: 50,
  MAX_DISPLAY_ENTRIES: 10,
  PERCENTILE_MEAN: 5,
  PERCENTILE_STD_DEV: 15,
} as const;

export const PLAYER_CONFIG = {
  STORAGE_KEY: 'trading_simulator_profile_v1',
  MAX_NAME_LENGTH: 12,
} as const;

export const DATASET_POOL = [
  { url: 'coke.csv', name: 'Coca-Cola', ticker: 'KO' },
  { url: 'btc.csv', name: 'Bitcoin', ticker: 'BTC' },
  { url: 'aapl.csv', name: 'Apple', ticker: 'AAPL' },
  { url: 'tsla.csv', name: 'Tesla', ticker: 'TSLA' },
] as const;

export const SPX_FALLBACK_PRICE = 1000;

