import { StockData, PricePoint } from '../types';
import { DATASET_POOL, SPX_FALLBACK_PRICE, GAME_CONFIG } from '../constants';

interface SimplePoint {
  timestamp: number;
  price: number;
}

// Helper: Interpolate S&P 500 price for a specific timestamp
// We use linear interpolation because SPX data is monthly but Stock data is daily.
const getInterpolatedSPX = (timestamp: number, spxData: SimplePoint[]): number => {
  if (spxData.length === 0) return SPX_FALLBACK_PRICE;

  // 1. Handle out of bounds
  if (timestamp <= spxData[0].timestamp) return spxData[0].price;
  if (timestamp >= spxData[spxData.length - 1].timestamp) return spxData[spxData.length - 1].price;

  // 2. Find the surrounding points (Linear Scan is fine for this dataset size, Binary Search would be faster but overkill here)
  for (let i = 0; i < spxData.length - 1; i++) {
    const p1 = spxData[i];
    const p2 = spxData[i + 1];

    if (timestamp >= p1.timestamp && timestamp <= p2.timestamp) {
      const totalDiff = p2.timestamp - p1.timestamp;
      const timeDiff = timestamp - p1.timestamp;
      const ratio = timeDiff / totalDiff;
      
      return p1.price + (ratio * (p2.price - p1.price));
    }
  }

  return spxData[spxData.length - 1].price;
};

// Helper: Parse CSV text into StockData
const parseCustomCSV = (
  csvText: string, 
  name: string, 
  ticker: string, 
  uniqueId: string,
  spxData: SimplePoint[]
): StockData => {
  // Handle different newline formats (CRLF, LF, CR)
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  
  // Skip header (assume row 0 is header)
  const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;

  // Parse rows
  let parsedRows = [];

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

  // SMOOTHING: Apply a 3-point Moving Average to reduce jaggedness and make the game more playable
  if (parsedRows.length > 3) {
    parsedRows = parsedRows.map((row, i, arr) => {
      if (i < 2) return row; // Skip first 2 points
      // Calculate average of current + previous 2 points
      const smoothedPrice = (row.price + arr[i - 1].price + arr[i - 2].price) / 3;
      return { ...row, price: smoothedPrice };
    });
  }

  // OPTIMIZATION: Limit to ~450 data points (approx 36s gameplay)
  let limitedRows = parsedRows;
  
  if (parsedRows.length > GAME_CONFIG.MAX_DATA_POINTS) {
    // CRITICAL: Randomize start point. This allows the same CSV file to generate 
    // multiple different "levels" if selected multiple times.
    const maxStart = parsedRows.length - GAME_CONFIG.MAX_DATA_POINTS;
    const startTrim = Math.floor(Math.random() * maxStart);
    limitedRows = parsedRows.slice(startTrim, startTrim + GAME_CONFIG.MAX_DATA_POINTS);
  }

  // Attach Real S&P 500 Data via Interpolation
  const finalData: PricePoint[] = limitedRows.map((row) => {
    return {
      ...row,
      sp500: getInterpolatedSPX(row.timestamp, spxData)
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

// Helper: Parse the master SPX csv
const parseSPXData = (csvText: string): SimplePoint[] => {
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  const startIndex = lines[0]?.toLowerCase().includes('date') ? 1 : 0;
  const points: SimplePoint[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 2) continue;
    
    const dateStr = parts[0].trim();
    const priceVal = parseFloat(parts[1].trim());
    
    if (!isNaN(priceVal)) {
      points.push({
        timestamp: new Date(dateStr).getTime(),
        price: priceVal
      });
    }
  }
  // Important: Sort Ascending for interpolation logic
  return points.sort((a, b) => a.timestamp - b.timestamp);
};

export const loadGameData = async (numberOfRounds: number = 3): Promise<StockData[]> => {
  try {
    // 1. Fetch S&P 500 Data FIRST (Real Data)
    let spxData: SimplePoint[] = [];
    try {
      const spxRes = await fetch('spx.csv');
      if (spxRes.ok) {
        const spxText = await spxRes.text();
        spxData = parseSPXData(spxText);
      } else {
        console.warn("spx.csv not found, falling back to flat line");
      }
    } catch (e) {
      console.error("Failed to load SPX data", e);
    }

    // 2. Select random datasets for the requested number of rounds
    const selection = [];
    for (let i = 0; i < numberOfRounds; i++) {
      const randomDataset = DATASET_POOL[Math.floor(Math.random() * DATASET_POOL.length)];
      selection.push({
        ...randomDataset,
        // Append index to ensure unique ID if the same file is picked twice
        uniqueId: `${randomDataset.ticker}-${i}-${Date.now()}` 
      });
    }

    // 3. Fetch and parse stock data, injecting the SPX reference
    const promises = selection.map(async (ds) => {
      try {
        const response = await fetch(ds.url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const text = await response.text();
        return parseCustomCSV(text, ds.name, ds.ticker, ds.uniqueId, spxData);
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