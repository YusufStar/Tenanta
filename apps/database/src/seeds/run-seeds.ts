import { databasePool } from '../config/database';

async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Test database connection
    const client = await databasePool.connect();
    
    // Insert system data
    console.log('📝 Inserting system data...');
    
    // Insert system info for tenant_1
    const systemInfoQueries = [
      `INSERT INTO tenant_1.system_info (key, value) 
       VALUES ('tenant_created', 'true')
       ON CONFLICT (key) DO NOTHING`,
      
      `INSERT INTO tenant_1.system_info (key, value) 
       VALUES ('schema_management_enabled', 'true')
       ON CONFLICT (key) DO NOTHING`,
      
      `INSERT INTO tenant_1.system_info (key, value) 
       VALUES ('max_schemas_per_tenant', '50')
       ON CONFLICT (key) DO NOTHING`
    ];
    
    for (const query of systemInfoQueries) {
      await client.query(query);
    }
    
    client.release();
    console.log('✅ Database seeding completed successfully!');
    console.log('💡 System is ready for dynamic schema creation');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await databasePool.end();
  }
}

// Run seeds if this file is executed directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds }; 