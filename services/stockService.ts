import { StockData, PricePoint } from '../types';

const STOCK_NAMES = [
  { name: 'NVIDIA Corp', ticker: 'NVDA' },
  { name: 'Tesla Inc', ticker: 'TSLA' },
  { name: 'Apple Inc', ticker: 'AAPL' },
  { name: 'Microsoft Corp', ticker: 'MSFT' },
  { name: 'Amazon.com', ticker: 'AMZN' },
  { name: 'Meta Platforms', ticker: 'META' },
  { name: 'Netflix Inc', ticker: 'NFLX' },
  { name: 'AMD', ticker: 'AMD' },
  { name: 'Alphabet Inc', ticker: 'GOOGL' },
  { name: 'Gamestop', ticker: 'GME' },
];

// Helper to format date
const formatDate = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

// Generate a random walk with trend
const generatePricePath = (startPrice: number, volatility: number, trend: number, steps: number, isIndex = false): number[] => {
  const prices = [startPrice];
  let currentPrice = startPrice;

  for (let i = 1; i < steps; i++) {
    const change = (Math.random() - 0.5) * volatility + trend;
    // Add some momentum logic for stocks (not index)
    const momentum = isIndex ? 0 : (Math.random() - 0.5) * (volatility * 0.5);
    
    const percentChange = change + momentum;
    currentPrice = currentPrice * (1 + percentChange);
    
    if (currentPrice < 0.01) currentPrice = 0.01; // Prevent negative prices
    prices.push(currentPrice);
  }
  return prices;
};

export const generateSessionStocks = (): StockData[] => {
  // Shuffle names
  const shuffled = [...STOCK_NAMES].sort(() => 0.5 - Math.random());
  
  // Limit to 3 stocks for the game session
  const selectedStocks = shuffled.slice(0, 3);
  
  return selectedStocks.map((stock, index) => {
    const steps = 150; // Number of data points in the chart
    const startDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 11), 1);
    
    // Randomize volatility and trend to create diverse scenarios
    // Volatility: 0.01 to 0.05 (1% to 5% daily swings)
    const volatility = 0.015 + Math.random() * 0.03; 
    // Trend: Slight bias up or down (-0.5% to +0.5% average drift)
    const trend = (Math.random() - 0.45) * 0.01; 

    const startPrice = 100 + Math.random() * 400;
    const stockPrices = generatePricePath(startPrice, volatility, trend, steps);
    
    // S&P 500 usually less volatile, slight upward trend generally
    const sp500Start = 3500 + Math.random() * 1000;
    const sp500Prices = generatePricePath(sp500Start, 0.008, 0.0005, steps, true);

    const data: PricePoint[] = stockPrices.map((price, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * 3)); // Skip a few days to simulate time
      return {
        date: formatDate(date),
        price: price,
        sp500: sp500Prices[i],
        timestamp: date.getTime(),
      };
    });

    return {
      id: `stock-${index}`,
      name: stock.name,
      ticker: stock.ticker,
      periodStart: data[0].date,
      periodEnd: data[data.length - 1].date,
      data,
    };
  });
};