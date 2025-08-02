-- Tenanta Database Schema
-- Initial setup for multi-tenant database system

-- Create database if not exists (run this as superuser)
-- CREATE DATABASE tenanta;

-- Connect to the database
-- \c tenanta;

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

-- Create users table in public schema
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
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
-- Users will create their own tables through the schema management interface
-- This table stores system configuration for the tenant
CREATE TABLE IF NOT EXISTS tenant_1.system_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Users can create their own schemas and tables through the client application
-- The schema management interface allows dynamic creation of:
-- - Custom schemas within the tenant
-- - Custom tables with any structure
-- - Relationships between tables
-- - Indexes and constraints

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
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
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schemas_updated_at BEFORE UPDATE ON public.schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_info_updated_at BEFORE UPDATE ON tenant_1.system_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default tenant
INSERT INTO public.tenants (name, slug, schema_name) 
VALUES ('Default Tenant', 'default', 'tenant_1')
ON CONFLICT (slug) DO NOTHING;

-- Insert default user
INSERT INTO public.users (tenant_id, email, name)
SELECT id, 'admin@tenanta.com', 'Admin User'
FROM public.tenants 
WHERE slug = 'default'
ON CONFLICT DO NOTHING; 