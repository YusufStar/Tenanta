import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔧 Initializing database...');

    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    // Run initialization SQL
    const initSQL = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Create schemas for multi-tenant architecture
      CREATE SCHEMA IF NOT EXISTS public;
      CREATE SCHEMA IF NOT EXISTS tenant_1;
      CREATE SCHEMA IF NOT EXISTS tenant_2;
      CREATE SCHEMA IF NOT EXISTS tenant_3;

      -- Set default schema
      SET search_path TO public, tenant_1, tenant_2, tenant_3;

      -- Create tenants table in public schema
      CREATE TABLE IF NOT EXISTS public.tenants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          schema_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true
      );

      -- Create schemas table in public schema for dynamic schema metadata
      CREATE TABLE IF NOT EXISTS public.schemas (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          version INTEGER DEFAULT 1,
          definition JSONB NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id, name)
      );

      -- Create system tables for tenant_1 schema (minimal setup)
      CREATE TABLE IF NOT EXISTS tenant_1.system_info (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_schemas_tenant_id ON public.schemas(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_schemas_name ON public.schemas(name);
      CREATE INDEX IF NOT EXISTS idx_system_info_key ON tenant_1.system_info(key);

      -- Create updated_at trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create triggers for updated_at
      DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
      CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_schemas_updated_at ON public.schemas;
      CREATE TRIGGER update_schemas_updated_at BEFORE UPDATE ON public.schemas
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_system_info_updated_at ON tenant_1.system_info;
      CREATE TRIGGER update_system_info_updated_at BEFORE UPDATE ON tenant_1.system_info
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Insert default tenant
      INSERT INTO public.tenants (name, slug, schema_name) 
      VALUES ('Default Tenant', 'default', 'tenant_1')
      ON CONFLICT (slug) DO NOTHING;
    `;

    await client.query(initSQL);
    console.log('✅ Database initialization completed successfully');

    client.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase }; 