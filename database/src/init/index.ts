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

    // Cleanup phase - Drop all existing data and models
    console.log('🧹 Cleaning up existing data and models...');
    const cleanupSQL = `
      -- Drop all triggers first
      DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
      DROP TRIGGER IF EXISTS update_schemas_updated_at ON public.schemas;
      DROP TRIGGER IF EXISTS update_system_info_updated_at ON tenant_1.system_info;
      DROP TRIGGER IF EXISTS update_system_info_updated_at ON tenant_2.system_info;
      DROP TRIGGER IF EXISTS update_system_info_updated_at ON tenant_3.system_info;

      -- Drop all tables in tenant schemas
      DROP TABLE IF EXISTS tenant_1.system_info CASCADE;
      DROP TABLE IF EXISTS tenant_1.application_logs CASCADE;
      DROP TABLE IF EXISTS tenant_2.system_info CASCADE;
      DROP TABLE IF EXISTS tenant_2.application_logs CASCADE;
      DROP TABLE IF EXISTS tenant_3.system_info CASCADE;
      DROP TABLE IF EXISTS tenant_3.application_logs CASCADE;

      -- Drop all tables in public schema
      DROP TABLE IF EXISTS public.performance_metrics CASCADE;
      DROP TABLE IF EXISTS public.database_activity_logs CASCADE;
      DROP TABLE IF EXISTS public.system_logs CASCADE;
      DROP TABLE IF EXISTS public.schemas CASCADE;
      DROP TABLE IF EXISTS public.tenants CASCADE;

      -- Drop tenant schemas
      DROP SCHEMA IF EXISTS tenant_1 CASCADE;
      DROP SCHEMA IF EXISTS tenant_2 CASCADE;
      DROP SCHEMA IF EXISTS tenant_3 CASCADE;

      -- Drop function
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `;

    await client.query(cleanupSQL);
    console.log('✅ Cleanup completed successfully');

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

      -- Create system logs table in public schema for centralized logging
      CREATE TABLE IF NOT EXISTS public.system_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
          message TEXT NOT NULL,
          source VARCHAR(100),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create application logs table for tenant-specific logging
      CREATE TABLE IF NOT EXISTS tenant_1.application_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
          message TEXT NOT NULL,
          source VARCHAR(100),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create database activity logs table
      CREATE TABLE IF NOT EXISTS public.database_activity_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          operation_type VARCHAR(50) NOT NULL,
          table_name VARCHAR(100),
          query_text TEXT,
          execution_time_ms INTEGER,
          rows_affected INTEGER,
          error_message TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create performance metrics table
      CREATE TABLE IF NOT EXISTS public.performance_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metric_name VARCHAR(100) NOT NULL,
          metric_value DECIMAL(10,2) NOT NULL,
          metric_unit VARCHAR(20),
          threshold_value DECIMAL(10,2),
          status VARCHAR(20) CHECK (status IN ('healthy', 'warning', 'critical')),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_schemas_tenant_id ON public.schemas(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_schemas_name ON public.schemas(name);
      CREATE INDEX IF NOT EXISTS idx_system_info_key ON tenant_1.system_info(key);
      
      -- Log indexes
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_id ON public.system_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_system_logs_source ON public.system_logs(source);
      
      CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp ON tenant_1.application_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_application_logs_level ON tenant_1.application_logs(level);
      CREATE INDEX IF NOT EXISTS idx_application_logs_source ON tenant_1.application_logs(source);
      
      CREATE INDEX IF NOT EXISTS idx_database_activity_logs_timestamp ON public.database_activity_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_database_activity_logs_tenant_id ON public.database_activity_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_database_activity_logs_operation_type ON public.database_activity_logs(operation_type);
      
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_id ON public.performance_metrics(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON public.performance_metrics(metric_name);

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

      -- Insert initial schema initialization log
      INSERT INTO public.system_logs (tenant_id, timestamp, level, message, source) 
      SELECT 
          t.id,
          NOW(),
          'success',
          'Database schema initialized successfully with log tables',
          'DatabaseInit'
      FROM public.tenants t
      WHERE t.slug = 'default';

      -- Insert initial performance metric
      INSERT INTO public.performance_metrics (tenant_id, timestamp, metric_name, metric_value, metric_unit, threshold_value, status)
      SELECT 
          t.id,
          NOW(),
          'System Status',
          100.0,
          '%',
          100.0,
          'healthy'
      FROM public.tenants t
      WHERE t.slug = 'default';
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