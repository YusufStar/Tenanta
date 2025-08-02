import { readFileSync } from 'fs';
import { join } from 'path';
import { databasePool, testDatabaseConnection } from '../config/database';

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Test database connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Read and execute init.sql
    const initSqlPath = join(__dirname, '../schemas/init.sql');
    const initSql = readFileSync(initSqlPath, 'utf8');
    
    console.log('📝 Executing database schema...');
    await databasePool.query(initSql);
    
    console.log('✅ Database migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await databasePool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations }; 