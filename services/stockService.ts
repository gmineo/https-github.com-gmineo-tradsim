import { StockData, PricePoint } from '../types';

// Helper: Parse CSV text into StockData
const parseCustomCSV = (csvText: string, name: string, ticker: string, uniqueId: string): StockData => {
  // Handle different newline formats (CRLF, LF, CR)
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  
  // Skip header (assume row 0 is header)
  const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;

  // Parse rows
  const parsedRows = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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

  // OPTIMIZATION: Limit to ~450 data points (approx 36s gameplay)
  const MAX_POINTS = 450;
  let limitedRows = parsedRows;
  
  if (parsedRows.length > MAX_POINTS) {
    // CRITICAL: Randomize start point. This allows the same CSV file to generate 
    // multiple different "levels" if selected multiple times.
    const maxStart = parsedRows.length - MAX_POINTS;
    const startTrim = Math.floor(Math.random() * maxStart);
    limitedRows = parsedRows.slice(startTrim, startTrim + MAX_POINTS);
  }

  // Generate fake S&P 500 comparison data
  let currentSP500 = 2000;
  
  const finalData: PricePoint[] = limitedRows.map((row, idx) => {
    if (idx > 0) {
      const prevPrice = limitedRows[idx - 1].price;
      const priceChange = (row.price - prevPrice) / prevPrice;
      const marketMove = (priceChange * 0.6) + ((Math.random() - 0.5) * 0.005);
      currentSP500 = currentSP500 * (1 + marketMove);
    }

    return {
      ...row,
      sp500: currentSP500
    };
  });

  return {
    id: uniqueId, // Use unique ID to allow duplicates of same stock in one session
    name,
    ticker,
    periodStart: finalData[0]?.date || 'Start',
    periodEnd: finalData[finalData.length - 1]?.date || 'End',
    data: finalData
  };
};

// Defines the pool of available files on the server
const DATASET_POOL = [
  { url: 'coke.csv', name: 'Coca-Cola', ticker: 'KO' },
  { url: 'btc.csv', name: 'Bitcoin', ticker: 'BTC' },
  { url: 'aapl.csv', name: 'Apple', ticker: 'AAPL' }
];

export const loadGameData = async (numberOfRounds: number = 3): Promise<StockData[]> => {
  try {
    // Select random datasets for the requested number of rounds
    const selection = [];
    for (let i = 0; i < numberOfRounds; i++) {
      const randomDataset = DATASET_POOL[Math.floor(Math.random() * DATASET_POOL.length)];
      selection.push({
        ...randomDataset,
        // Append index to ensure unique ID if the same file is picked twice
        uniqueId: `${randomDataset.ticker}-${i}-${Date.now()}` 
      });
    }

    const promises = selection.map(async (ds) => {
      try {
        const response = await fetch(ds.url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const text = await response.text();
        return parseCustomCSV(text, ds.name, ds.ticker, ds.uniqueId);
      } catch (err) {
        console.error(`Failed to load ${ds.url}:`, err);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((item): item is StockData => item !== null && item.data && item.data.length > 0);
  } catch (e) {
    console.error("Critical error loading game data", e);
    return [];
  }
};