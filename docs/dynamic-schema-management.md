# 🔄 Dynamic Schema Management

This document describes the dynamic schema creation and management capabilities of the Tenanta system, allowing users to create and manage their own database schemas within projects.

## 📋 Overview

The Tenanta system provides a powerful dynamic schema management feature that allows users to:

- Create custom database schemas for each project
- Define custom tables, columns, and relationships
- Manage schema versions and migrations
- Validate schema definitions
- Visualize schema structure
- Import/export schema definitions

## 🏗️ Architecture

### Multi-Tenant Schema Structure

```
tenanta_database/
├── public/                    # System tables
│   ├── tenants              # Tenant information
│   ├── users                # User information
│   └── schemas              # Schema metadata
├── tenant_1/                # Project-specific schemas
│   ├── projects            # Project management
│   ├── custom_schema_1     # User-created schema
│   ├── custom_schema_2     # User-created schema
│   └── ...
├── tenant_2/                # Another project
│   ├── projects
│   ├── custom_schema_1
│   └── ...
└── ...
```

### Schema Metadata Management

The system maintains metadata about user-created schemas in the `public.schemas` table:

```sql
CREATE TABLE public.schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Features

### 1. Schema Creation

Users can create new schemas through the client application:

- **Schema Name**: Unique identifier for the schema
- **Description**: Optional description of the schema purpose
- **Tables**: Define custom tables with columns, data types, and constraints
- **Relationships**: Define foreign key relationships between tables
- **Indexes**: Create indexes for performance optimization

### 2. Schema Validation

The system validates schema definitions before creation:

- **Syntax Validation**: Ensures valid SQL syntax
- **Naming Conventions**: Validates table and column naming
- **Data Type Validation**: Ensures supported data types
- **Constraint Validation**: Validates primary keys, foreign keys, and unique constraints
- **Security Validation**: Prevents SQL injection and malicious code

### 3. Schema Versioning

Each schema maintains version history:

- **Version Tracking**: Automatic version incrementing
- **Migration History**: Tracks all schema changes
- **Rollback Capability**: Ability to revert to previous versions
- **Change Log**: Detailed log of all modifications

### 4. Schema Visualization

The client application provides:

- **Schema Diagram**: Visual representation of tables and relationships
- **Table Structure**: Detailed view of table columns and constraints
- **Relationship Map**: Visual mapping of foreign key relationships
- **Data Preview**: Sample data display for tables

## 🔧 API Endpoints

### Schema Management

```typescript
// Create new schema
POST /api/schemas
{
  "name": "custom_schema",
  "description": "Custom schema for project data",
  "definition": {
    "tables": [
      {
        "name": "custom_table",
        "columns": [
          {
            "name": "id",
            "type": "UUID",
            "primaryKey": true,
            "default": "uuid_generate_v4()"
          },
          {
            "name": "name",
            "type": "VARCHAR(255)",
            "notNull": true
          },
          {
            "name": "created_at",
            "type": "TIMESTAMP",
            "default": "NOW()"
          }
        ]
      }
    ]
  }
}

// Get schema list
GET /api/schemas

// Get schema details
GET /api/schemas/:id

// Update schema
PUT /api/schemas/:id

// Delete schema
DELETE /api/schemas/:id

// Get schema version history
GET /api/schemas/:id/versions

// Rollback to previous version
POST /api/schemas/:id/rollback/:version
```

### Data Operations

```typescript
// Insert data into custom table
POST /api/schemas/:schemaId/tables/:tableName/data

// Query data from custom table
GET /api/schemas/:schemaId/tables/:tableName/data

// Update data in custom table
PUT /api/schemas/:schemaId/tables/:tableName/data/:id

// Delete data from custom table
DELETE /api/schemas/:schemaId/tables/:tableName/data/:id
```

## 🎨 Client Interface

### Schema Management UI

The client application provides a comprehensive schema management interface:

#### 1. Schema List View
- **Schema Grid**: Display all schemas in a project
- **Search & Filter**: Find schemas by name or description
- **Quick Actions**: Create, edit, delete schemas
- **Status Indicators**: Active/inactive schema status

#### 2. Schema Editor
- **Visual Builder**: Drag-and-drop table creation
- **Column Editor**: Define columns with data types and constraints
- **Relationship Builder**: Create foreign key relationships
- **Validation Panel**: Real-time schema validation feedback

#### 3. Schema Viewer
- **Schema Diagram**: Visual representation of tables
- **Table Details**: Expandable table information
- **Data Preview**: Sample data display
- **Export Options**: Export schema as SQL or JSON

#### 4. Data Management
- **Data Grid**: CRUD operations for table data
- **Bulk Operations**: Import/export data
- **Query Builder**: Visual query construction
- **Results Viewer**: Data visualization and export

## 🔒 Security Considerations

### Schema Isolation
- Each project's schemas are isolated in separate PostgreSQL schemas
- No cross-project schema access
- Schema names are validated to prevent conflicts

### Access Control
- Schema creation requires project ownership
- Schema modifications are logged and audited
- Dangerous operations (DROP, TRUNCATE) are restricted

### Input Validation
- All schema definitions are validated before execution
- SQL injection prevention through parameterized queries
- Schema name and table name validation

## 📊 Performance Optimization

### Schema Caching
- Schema definitions are cached in Redis
- Schema metadata is cached for quick access
- Cache invalidation on schema changes

### Query Optimization
- Automatic index creation for primary keys
- Foreign key index suggestions
- Query performance monitoring

### Database Optimization
- Connection pooling for schema operations
- Transaction management for schema changes
- Rollback capability for failed operations

## 🛠️ Implementation Details

### Database Schema Creation

```sql
-- Create schema for project
CREATE SCHEMA IF NOT EXISTS tenant_1.custom_schema_1;

-- Create table within schema
CREATE TABLE tenant_1.custom_schema_1.custom_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_custom_table_name ON tenant_1.custom_schema_1.custom_table(name);

-- Create updated_at trigger
CREATE TRIGGER update_custom_table_updated_at 
    BEFORE UPDATE ON tenant_1.custom_schema_1.custom_table
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Schema Validation Service

```typescript
interface SchemaValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

class SchemaValidator {
  validateSchemaDefinition(definition: SchemaDefinition): SchemaValidationResult;
  validateTableDefinition(table: TableDefinition): TableValidationResult;
  validateColumnDefinition(column: ColumnDefinition): ColumnValidationResult;
  validateRelationshipDefinition(relationship: RelationshipDefinition): RelationshipValidationResult;
}
```

### Schema Migration Service

```typescript
interface SchemaMigration {
  id: string;
  schemaId: string;
  version: number;
  sql: string;
  appliedAt: Date;
  rollbackSql?: string;
}

class SchemaMigrationService {
  applyMigration(schemaId: string, migration: SchemaMigration): Promise<void>;
  rollbackMigration(schemaId: string, version: number): Promise<void>;
  getMigrationHistory(schemaId: string): Promise<SchemaMigration[]>;
}
```

## 📈 Monitoring and Analytics

### Schema Usage Metrics
- **Schema Count**: Number of schemas per project
- **Table Count**: Number of tables per schema
- **Data Volume**: Amount of data stored in custom schemas
- **Query Performance**: Performance metrics for custom schema queries

### Schema Health Monitoring
- **Validation Errors**: Track schema validation failures
- **Migration Success Rate**: Monitor successful vs failed migrations
- **Performance Alerts**: Alert on slow queries or large data volumes

## 🔄 Future Enhancements

### Planned Features
- **Schema Templates**: Pre-built schema templates for common use cases
- **Schema Import/Export**: Import schemas from external sources
- **Advanced Relationships**: Many-to-many relationships and complex constraints
- **Schema Analytics**: Advanced analytics and reporting capabilities
- **Collaborative Editing**: Multi-user schema editing with conflict resolution

### Integration Possibilities
- **External Data Sources**: Connect to external databases and APIs
- **Data Synchronization**: Sync data between different schemas
- **Advanced Visualization**: Enhanced schema diagrams and data flow visualization
- **API Generation**: Automatic API generation for custom schemas

## 📚 Related Documentation

- [Project Structure](./PROJECT_STRUCTURE.md) - Overall project architecture
- [Database Configuration](./database-configuration.md) - Database setup and configuration
- [Redis Configuration](./redis-configuration.md) - Redis setup and usage
- [API Documentation](./api-documentation.md) - Complete API reference 