
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
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'ok' };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  if (!process.env.DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL is missing from environment variables.");
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: "Server configuration error: Database URL missing." }) 
    };
  }

  // Ensure SSL is used. Neon requires SSL.
  const connectionString = process.env.DATABASE_URL;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Necessary for many hosted Postgres instances including Neon
    connectionTimeoutMillis: 5000
  });

  try {
    console.log(`[${event.httpMethod}] Attempting DB connection...`);
    await client.connect();
    console.log("DB Connected successfully.");

    // Auto-create table if not exists (Safety check)
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

    if (event.httpMethod === 'GET') {
      const result = await client.query(
        'SELECT name, total_profit as "totalProfit", total_return as "totalReturn", date, timestamp FROM leaderboard ORDER BY total_return DESC LIMIT 50'
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

    if (event.httpMethod === 'POST') {
      if (!event.body) return { statusCode: 400, headers, body: 'Missing body' };
      
      let data: LeaderboardEntry;
      try {
        data = JSON.parse(event.body);
      } catch (e) {
        return { statusCode: 400, headers, body: 'Invalid JSON' };
      }
      
      const safeProfit = Number.isFinite(data.totalProfit) ? data.totalProfit : 0;
      const safeReturn = Number.isFinite(data.totalReturn) ? data.totalReturn : 0;
      const safeName = (data.name || 'Anonymous').slice(0, 50);
      const safeDate = data.date || new Date().toLocaleDateString();
      const safeTimestamp = data.timestamp || Date.now();

      console.log(`Saving score for ${safeName}: ${safeReturn}%`);

      await client.query(
        'INSERT INTO leaderboard (name, total_profit, total_return, date, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [safeName, safeProfit, safeReturn, safeDate, safeTimestamp]
      );

      // Return updated leaderboard
      const result = await client.query(
        'SELECT name, total_profit as "totalProfit", total_return as "totalReturn", date, timestamp FROM leaderboard ORDER BY total_return DESC LIMIT 10'
      );
      
      const cleaned = result.rows.map((row: any) => ({
        ...row,
        totalProfit: parseFloat(row.totalProfit),
        totalReturn: parseFloat(row.totalReturn),
        timestamp: parseInt(row.timestamp)
      }));

      console.log("Save successful, returning updated list.");

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cleaned),
      };
    }

  } catch (error: any) {
    console.error('DATABASE OPERATION FAILED:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database error', 
        details: error.message || 'Unknown error',
        hint: "Check DATABASE_URL and SSL settings in Netlify."
      }),
    };
  } finally {
    // Clean up connection
    await client.end().catch(() => {});
  }
};
