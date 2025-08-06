import { Parser, ModelExporter } from '@dbml/core';
import { Node, Edge } from '@xyflow/react';

// Types
export interface ParsedColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
  note?: string;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
  note?: string;
}

export interface ParsedRelationship {
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
}

export interface ParsedSchema {
  tables: ParsedTable[];
  relationships: ParsedRelationship[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ParseResult {
  isValid: boolean;
  errors: ValidationError[];
  parsedSchema?: ParsedSchema;
}

/**
 * Parse DBML code using the official @dbml/core parser
 */
export function parseDBML(code: string): ParseResult {
  try {
    const parser = new Parser();
    const database = parser.parse(code, 'dbml');
    
    // Convert to our format
    const tables: ParsedTable[] = database.schemas[0]?.tables.map(table => ({
      name: table.name,
      note: table.note,
      columns: table.fields.map(field => ({
        name: field.name,
        type: field.type.type_name,
        primaryKey: field.pk || false,
        nullable: !field.not_null,
        unique: field.unique || false,
        default: field.dbdefault?.value,
        note: field.note
      }))
    })) || [];

    const relationships: ParsedRelationship[] = database.schemas[0]?.refs.map((ref, index) => ({
      name: ref.name || `${ref.endpoints[0].tableName}_${ref.endpoints[0].fieldNames[0]}_${ref.endpoints[1].tableName}_${ref.endpoints[1].fieldNames[0]}_${index}`,
      fromTable: ref.endpoints[0].tableName,
      fromColumn: ref.endpoints[0].fieldNames[0],
      toTable: ref.endpoints[1].tableName,
      toColumn: ref.endpoints[1].fieldNames[0],
      type: ref.endpoints[0].relation
    })) || [];

    return {
      isValid: true,
      errors: [],
      parsedSchema: { tables, relationships }
    };

  } catch (error: any) {
    const errors: ValidationError[] = [];
    
    // Parse DBML error messages
    if (error.location) {
      errors.push({
        line: error.location.start.line,
        column: error.location.start.column,
        message: error.message || 'Parse error',
        severity: 'error'
      });
    } else {
      // Generic error
      errors.push({
        line: 1,
        column: 1,
        message: error.message || 'Unknown parsing error',
        severity: 'error'
      });
    }

    return {
      isValid: false,
      errors,
    };
  }
}

/**
 * Convert ReactFlow nodes and edges to DBML code
 */
export function nodesToDBML(nodes: Node[], edges: Edge[]): string {
  let dbmlCode = '// Database Schema\n// Generated from visual editor\n\n';

  // Convert nodes to tables
  nodes.forEach(node => {
    if (node.type === 'databaseSchema' && node.data) {
      dbmlCode += `Table ${node.data.label} {\n`;
      
      if (node.data.schema && Array.isArray(node.data.schema)) {
        node.data.schema.forEach((column: any) => {
          let columnLine = `  ${column.title} ${column.type}`;
          
          // Add constraints if available
          const constraints = [];
          if (column.primaryKey) constraints.push('primary key');
          if (column.unique) constraints.push('unique');
          if (column.nullable === false) constraints.push('not null');
          if (column.default) constraints.push(`default: '${column.default}'`);
          
          if (constraints.length > 0) {
            columnLine += ` [${constraints.join(', ')}]`;
          }
          
          dbmlCode += columnLine + '\n';
        });
      }
      
      dbmlCode += '}\n\n';
    }
  });

  // Convert edges to relationships
  edges.forEach(edge => {
    if (edge.source && edge.target && edge.sourceHandle && edge.targetHandle) {
      dbmlCode += `Ref: ${edge.source}.${edge.sourceHandle} > ${edge.target}.${edge.targetHandle}\n`;
    }
  });

  return dbmlCode;
}

/**
 * Convert parsed schema to ReactFlow nodes and edges
 */
export function schemaToNodes(parsedSchema: ParsedSchema, existingNodes: Node[] = []): { nodes: Node[], edges: Edge[] } {
  // Create nodes
  const nodes: Node[] = parsedSchema.tables.map((table, index) => {
    // Preserve existing position if table exists
    const existingNode = existingNodes.find(node => node.id === table.name);
    
    return {
      id: table.name,
      position: existingNode 
        ? existingNode.position 
        : { 
            x: (index % 3) * 400 + Math.random() * 50, // Add slight randomness to avoid overlap
            y: Math.floor(index / 3) * 350 + Math.random() * 50 
          },
      type: "databaseSchema",
      data: {
        label: table.name,
        schema: table.columns.map(col => ({ 
          title: col.name, 
          type: col.type,
          primaryKey: col.primaryKey,
          nullable: col.nullable,
          unique: col.unique,
          default: col.default
        }))
      },
      dragHandle: ".drag-handle"
    };
  });

  // Create edges
  const edges: Edge[] = parsedSchema.relationships.map((rel, index) => {
    // Create a unique edge ID to avoid collisions
    const edgeId = rel.name 
      ? `${rel.name}-${index}` 
      : `edge-${rel.fromTable}-${rel.fromColumn}-${rel.toTable}-${rel.toColumn}-${index}`;
    
    return {
      id: edgeId,
      source: rel.fromTable,
      target: rel.toTable,
      sourceHandle: rel.fromColumn,
      targetHandle: rel.toColumn,
      type: "smoothstep",
      animated: true,
      label: `${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`,
      style: { stroke: '#64748b', strokeWidth: 2 }
    };
  });

  return { nodes, edges };
}

/**
 * Convert API schema overview to DBML code
 */
export function apiSchemaToDBML(tables: any[], relationships: any[]): string {
  let dbmlCode = '// Database Schema\n// Current database structure\n\n';

  // Convert tables
  tables.forEach(table => {
    dbmlCode += `Table ${table.tableName} {\n`;
    
    if (table.columns && Array.isArray(table.columns)) {
      table.columns.forEach((column: any) => {
        let columnLine = `  ${column.title} ${column.type}`;
        
        // Add constraints
        const constraints = [];
        if (column.isPrimaryKey) constraints.push('primary key');
        if (column.isUnique) constraints.push('unique');
        if (column.isNullable === false) constraints.push('not null');
        if (column.columnDefault) constraints.push(`default: '${column.columnDefault}'`);
        
        if (constraints.length > 0) {
          columnLine += ` [${constraints.join(', ')}]`;
        }
        
        dbmlCode += columnLine + '\n';
      });
    }
    
    dbmlCode += '}\n\n';
  });

  // Convert relationships
  relationships.forEach(rel => {
    const relationSymbol = rel.onDelete === 'CASCADE' ? '>' : '-';
    dbmlCode += `Ref: ${rel.fromTable}.${rel.fromColumn} ${relationSymbol} ${rel.toTable}.${rel.toColumn}\n`;
  });

  return dbmlCode;
}
