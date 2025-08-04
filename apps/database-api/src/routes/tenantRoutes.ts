import { Router } from 'express';
import { TenantController } from '../controllers/tenantController';
import { validatePagination, validateCreateTenant } from '../middleware/validation';

const router = Router();
const tenantController = new TenantController();

// GET /api/v1/tenants - Get all tenants with pagination
router.get('/', validatePagination, tenantController.getAllTenants);

// POST /api/v1/tenants - Create a new tenant
router.post('/', validateCreateTenant, tenantController.createTenant);

// GET /api/v1/tenants/:id - Get tenant by ID
router.get('/:id', tenantController.getTenantById);

// DELETE /api/v1/tenants/:id - Delete tenant by ID
router.delete('/:id', tenantController.deleteTenant);

export default router; 