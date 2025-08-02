import { Pool, PoolClient } from 'pg';
import { logger } from '@tenanta/logging';

let pool: Pool;

export async function setupDatabase(): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export function getDatabasePool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call setupDatabase() first.');
  }
  return pool;
}

export async function getDatabaseClient(): Promise<PoolClient> {
  const pool = getDatabasePool();
  return pool.connect();
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('Database connection pool closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
}); 