
import { Client } from 'pg';

// Define the shape of our data
interface LeaderboardEntry {
  name: string;
  totalProfit: number;
  totalReturn: number;
  date: string;
  timestamp: number;
}

export const handler = async (event: any, context: any) => {
  // Headers to allow CORS (Cross-Origin Resource Sharing)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle pre-flight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  // Only allow GET (fetch) and POST (save)
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  if (!process.env.DATABASE_URL) {
    console.error("CRITICAL ERROR: DATABASE_URL environment variable is missing in Netlify.");
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: "Server configuration error: Database URL missing. Go to Netlify Site Settings > Environment Variables." }) 
    };
  }

  console.log(`[${event.httpMethod}] Connecting to database...`);

  // Connect to Neon Database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Neon
    connectionTimeoutMillis: 5000 // Fail fast if connection hangs
  });

  try {
    await client.connect();
    console.log("Database connected.");

    // --- AUTO-INITIALIZATION ---
    // Create the table automatically if it doesn't exist.
    // This prevents "relation does not exist" errors for new setups.
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        total_profit NUMERIC,
        total_return NUMERIC,
        date VARCHAR(20),
        timestamp BIGINT
      );
    `;
    await client.query(createTableQuery);
    // ---------------------------

    if (event.httpMethod === 'GET') {
      // Fetch top 50
      const result = await client.query(
        'SELECT name, total_profit as "totalProfit", total_return as "totalReturn", date, timestamp FROM leaderboard ORDER BY total_return DESC LIMIT 50'
      );
      
      // Map numeric strings back to numbers if necessary (pg returns numerics as strings)
      const cleaned = result.rows.map((row: any) => ({
        ...row,
        totalProfit: parseFloat(row.totalProfit),
        totalReturn: parseFloat(row.totalReturn),
        timestamp: parseInt(row.timestamp)
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cleaned),
      };
    }

    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return { statusCode: 400, headers, body: 'Missing body' };
      }
      
      let data: LeaderboardEntry;
      try {
        data = JSON.parse(event.body);
      } catch (e) {
        return { statusCode: 400, headers, body: 'Invalid JSON' };
      }
      
      // Sanitize inputs
      // Ensure we don't insert NaN or Infinity which crashes SQL
      const safeProfit = Number.isFinite(data.totalProfit) ? data.totalProfit : 0;
      const safeReturn = Number.isFinite(data.totalReturn) ? data.totalReturn : 0;
      const safeName = (data.name || 'Anonymous').slice(0, 50); // Limit name length
      const safeDate = data.date || new Date().toLocaleDateString();
      const safeTimestamp = data.timestamp || Date.now();

      console.log(`Inserting score for ${safeName}: ${safeReturn}%`);

      await client.query(
        'INSERT INTO leaderboard (name, total_profit, total_return, date, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [safeName, safeProfit, safeReturn, safeDate, safeTimestamp]
      );

      // Return the updated top 10 immediately
      const result = await client.query(
        'SELECT name, total_profit as "totalProfit", total_return as "totalReturn", date, timestamp FROM leaderboard ORDER BY total_return DESC LIMIT 10'
      );
      
      const cleaned = result.rows.map((row: any) => ({
        ...row,
        totalProfit: parseFloat(row.totalProfit),
        totalReturn: parseFloat(row.totalReturn),
        timestamp: parseInt(row.timestamp)
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cleaned),
      };
    }

  } catch (error: any) {
    console.error('DATABASE ERROR:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database operation failed', details: error.message }),
    };
  } finally {
    await client.end();
  }
};
