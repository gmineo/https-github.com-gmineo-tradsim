
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
  // Only allow GET (fetch) and POST (save)
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Connect to Neon Database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon/AWS usage usually
  });

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      // Fetch Top 10 sorted by Profit
      const result = await client.query(
        'SELECT name, total_profit as "totalProfit", total_return as "totalReturn", date, timestamp FROM leaderboard ORDER BY total_profit DESC LIMIT 10'
      );
      
      // Parse numeric fields from Postgres (they come as strings)
      const cleaned = result.rows.map((row: any) => ({
        ...row,
        totalProfit: parseFloat(row.totalProfit),
        totalReturn: parseFloat(row.totalReturn),
        timestamp: parseInt(row.timestamp)
      }));

      return {
        statusCode: 200,
        body: JSON.stringify(cleaned),
      };
    }

    if (event.httpMethod === 'POST') {
      if (!event.body) return { statusCode: 400, body: 'Missing body' };
      
      const data = JSON.parse(event.body) as LeaderboardEntry;
      
      // Insert new score
      await client.query(
        'INSERT INTO leaderboard (name, total_profit, total_return, date, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [data.name, data.totalProfit, data.totalReturn, data.date, data.timestamp]
      );

      // Return the updated top 10 immediately
      const result = await client.query(
        'SELECT name, total_profit as "totalProfit", total_return as "totalReturn", date, timestamp FROM leaderboard ORDER BY total_profit DESC LIMIT 10'
      );
      
      const cleaned = result.rows.map((row: any) => ({
        ...row,
        totalProfit: parseFloat(row.totalProfit),
        totalReturn: parseFloat(row.totalReturn),
        timestamp: parseInt(row.timestamp)
      }));

      return {
        statusCode: 200,
        body: JSON.stringify(cleaned),
      };
    }

  } catch (error: any) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed connecting to database', details: error.message }),
    };
  } finally {
    await client.end();
  }
};
