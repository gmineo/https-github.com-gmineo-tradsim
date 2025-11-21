import { StockData, PricePoint } from '../types';

// Helper: Parse CSV text into StockData
const parseCustomCSV = (csvText: string, name: string, ticker: string): StockData => {
  // Handle different newline formats (CRLF, LF, CR)
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  const data: PricePoint[] = [];
  
  // Skip header (assume row 0 is header)
  // In case of messy data, we look for the first line starting with a number or specific format
  const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;

  // Parse rows (Reverse to get oldest first if CSV is newest first)
  const parsedRows = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle potential messy CSVs (comma separation)
    const parts = line.split(',');
    if (parts.length < 2) continue;

    const dateStr = parts[0].trim();
    const priceVal = parseFloat(parts[1].trim());

    if (isNaN(priceVal)) continue;

    parsedRows.push({
      date: dateStr,
      price: priceVal,
      timestamp: new Date(dateStr).getTime()
    });
  }

  // Sort by date ascending (Oldest -> Newest)
  parsedRows.sort((a, b) => a.timestamp - b.timestamp);

  // OPTIMIZATION: Limit to ~450 data points for optimal gameplay duration (~36 seconds)
  // If we have too much data, we take a slice from the middle-end to ensure volatility but keep it short.
  // 450 points * 80ms = 36 seconds of gameplay.
  const MAX_POINTS = 450;
  let limitedRows = parsedRows;
  
  if (parsedRows.length > MAX_POINTS) {
    // Optional: Randomize start point to make the same CSV feel different every time?
    // For now, let's just take a consistent slice that isn't just the boring beginning.
    // We take the *last* MAX_POINTS usually, but let's take a safe slice.
    const startTrim = Math.floor(Math.random() * (parsedRows.length - MAX_POINTS));
    limitedRows = parsedRows.slice(startTrim, startTrim + MAX_POINTS);
  }

  // Generate fake S&P 500 comparison data if not present
  // We simulate a market correlation of 0.6 with some noise
  let currentSP500 = 2000; // Base 2000 approx for 2015/general
  
  const finalData: PricePoint[] = limitedRows.map((row, idx) => {
    if (idx > 0) {
      const prevPrice = limitedRows[idx - 1].price;
      const priceChange = (row.price - prevPrice) / prevPrice;
      
      // S&P moves somewhat correlated but less volatile usually
      const marketMove = (priceChange * 0.6) + ((Math.random() - 0.5) * 0.005);
      currentSP500 = currentSP500 * (1 + marketMove);
    }

    return {
      ...row,
      sp500: currentSP500
    };
  });

  return {
    id: ticker,
    name,
    ticker,
    periodStart: finalData[0]?.date || 'Start',
    periodEnd: finalData[finalData.length - 1]?.date || 'End',
    data: finalData
  };
};

export const loadGameData = async (): Promise<StockData[]> => {
  const datasets = [
    { url: 'coke.csv', name: 'Coca-Cola (Historical)', ticker: 'KO' },
    { url: 'btc.csv', name: 'Bitcoin (Historical)', ticker: 'BTC' },
    { url: 'aapl.csv', name: 'Apple (Historical)', ticker: 'AAPL' }
  ];

  try {
    const promises = datasets.map(async (ds) => {
      try {
        const response = await fetch(ds.url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const text = await response.text();
        return parseCustomCSV(text, ds.name, ds.ticker);
      } catch (err) {
        console.error(`Failed to load ${ds.url}:`, err);
        return null;
      }
    });

    const results = await Promise.all(promises);
    // Important: Filter out stocks that failed to load or have no data to prevent crashes
    return results.filter((item): item is StockData => item !== null && item.data && item.data.length > 0);
  } catch (e) {
    console.error("Critical error loading game data", e);
    return [];
  }
};

// Kept for compatibility if needed, but main app uses loadGameData now
export const getStaticStocks = (): StockData[] => {
  return [];
};