import { Router } from 'express';
import { LogController } from '../controllers/logController';
import { validateRequest } from '../middleware/validation';

const router = Router();

// System logs routes
router.get('/system', LogController.getSystemLogs);
router.post('/system', LogController.createSystemLog);

// Application logs routes
router.get('/application', LogController.getApplicationLogs);
router.post('/application/:tenantId', LogController.createApplicationLog);

// Performance metrics routes
router.get('/metrics', LogController.getPerformanceMetrics);
router.post('/metrics', LogController.createPerformanceMetric);

// Log statistics
router.get('/stats', LogController.getLogStats);

export default router; 