import { Router } from 'express';
import { DatabaseController } from '../controllers/databaseController';
import { validateUUID } from '../middleware/validation';

const router = Router();

// Get all tables for a tenant
router.get('/tenants/:tenantId/tables', validateUUID('tenantId'), DatabaseController.getTenantTables);

// Get table columns
router.get('/tenants/:tenantId/tables/:tableName/columns', 
  validateUUID('tenantId'), 
  DatabaseController.getTableColumns
);

// Get table data with pagination
router.get('/tenants/:tenantId/tables/:tableName/data', 
  validateUUID('tenantId'), 
  DatabaseController.getTableData
);

// Get database health status
router.get('/health', DatabaseController.getDatabaseHealth);

export default router; 