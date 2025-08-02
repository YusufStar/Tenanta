// Database app main exports
export * from './config/database';
export * from './config/redis';

// Migration and seeding functions
export { runMigrations } from './migrations/run-migrations';
export { runSeeds } from './seeds/run-seeds';

// Database utilities
export const databaseUtils = {
  async testConnections() {
    const { testDatabaseConnection, databasePool } = await import('./config/database');
    const { testRedisConnection, databaseApiRedis } = await import('./config/redis');
    
    console.log('🔍 Testing database connections...');
    
    const dbConnected = await testDatabaseConnection();
    const redisConnected = await testRedisConnection(databaseApiRedis);
    
    if (dbConnected && redisConnected) {
      console.log('✅ All connections successful!');
      return true;
    } else {
      console.log('❌ Some connections failed!');
      return false;
    }
  },
  
  async setupDatabase() {
    const { runMigrations } = await import('./migrations/run-migrations');
    const { runSeeds } = await import('./seeds/run-seeds');
    
    console.log('🚀 Setting up database...');
    
    try {
      await runMigrations();
      await runSeeds();
      console.log('✅ Database setup completed!');
      return true;
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      return false;
    }
  }
};

// Default export for easy importing
export default databaseUtils; 