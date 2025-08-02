import { Router } from 'express';
import { TenantController } from '../controllers/tenantController';
import { validatePagination, validateUUID } from '../middleware/validation';

const router = Router();
const tenantController = new TenantController();

// GET /api/v1/tenants - Get all tenants with pagination
router.get('/', validatePagination, tenantController.getAllTenants);

// GET /api/v1/tenants/:id - Get tenant by ID
router.get('/:id', validateUUID, tenantController.getTenantById);

export default router; 