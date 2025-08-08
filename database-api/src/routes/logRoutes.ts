import { Router } from 'express';
import { LogController } from '../controllers/logController';

const router = Router();

// System logs routes
router.get('/system', LogController.getSystemLogs);

export default router; 