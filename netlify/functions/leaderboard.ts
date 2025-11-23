
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
  // Headers to allow CORS (Cross-Origin Resource Sharing) if needed
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
      body: JSON.stringify({ error: "Server configuration error: Database URL missing" }) 
    };
  }

  console.log(`Attempting to connect to database... Method: ${event.httpMethod}`);

  // Connect to Neon Database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Neon
    connectionTimeoutMillis: 5000 // Fail fast if connection hangs
  });

  try {
    await client.connect();
    console.log("Database connected successfully.");

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
      if (!event.body) {
        console.error("POST request received but body is empty.");
        return { statusCode: 400, headers, body: 'Missing body' };
      }
      
      console.log("Parsing body:", event.body);
      let data: LeaderboardEntry;
      
      try {
        data = JSON.parse(event.body);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        return { statusCode: 400, headers, body: 'Invalid JSON' };
      }
      
      // Sanitize inputs
      const safeProfit = isFinite(data.totalProfit) ? data.totalProfit : 0;
      const safeReturn = isFinite(data.totalReturn) ? data.totalReturn : 0;
      const safeName = (data.name || 'Anonymous').slice(0, 50);
      const safeDate = data.date || new Date().toLocaleDateString();
      const safeTimestamp = data.timestamp || Date.now();

      console.log(`Inserting: ${safeName}, Return: ${safeReturn}%`);

      await client.query(
        'INSERT INTO leaderboard (name, total_profit, total_return, date, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [safeName, safeProfit, safeReturn, safeDate, safeTimestamp]
      );

      console.log("Insert successful. Fetching updated list...");

      // Return the updated top 10
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
    console.error('DATABASE ERROR DETAILED:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database operation failed', details: error.message }),
    };
  } finally {
    console.log("Closing DB connection.");
    await client.end();
  }
};
