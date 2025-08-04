import { Router } from 'express';
import { SchemaController } from '../controllers/schemaController';

const router = Router();
const schemaController = new SchemaController();

// Schema management routes
router.get('/:tenantId', schemaController.getTenantSchemas);
router.post('/:tenantId', schemaController.createSchema);
router.get('/:tenantId/overview', schemaController.getSchemaOverview);
router.get('/:tenantId/tables/:tableName', schemaController.getTableDetails);

// Individual schema routes
router.get('/schema/:schemaId', schemaController.getSchemaById);
router.put('/schema/:schemaId', schemaController.updateSchema);
router.delete('/schema/:schemaId', schemaController.deleteSchema);

export default router;
