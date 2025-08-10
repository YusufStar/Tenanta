import { Router } from 'express';
import { 
  executeQuery, 
  validateQuery, 
  getDatabaseStatus,
  getQueryHistory,
  clearOldQueryHistory
} from '../controllers/databaseController';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();

/**
 * @route POST /api/v1/database/:tenantId/execute
 * @desc Execute SQL query for a specific tenant
 * @access Private
 */
router.post(
  '/:tenantId/execute',
  [
    param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
    body('query')
      .notEmpty()
      .withMessage('Query is required')
      .isLength({ min: 1, max: 50000 })
      .withMessage('Query must be between 1 and 50000 characters'),
  ],
  validateRequest,
  executeQuery
);

/**
 * @route POST /api/v1/database/validate
 * @desc Validate SQL query without executing
 * @access Private
 */
router.post(
  '/validate',
  [
    body('query')
      .notEmpty()
      .withMessage('Query is required')
      .isLength({ min: 1, max: 50000 })
      .withMessage('Query must be between 1 and 50000 characters'),
  ],
  validateRequest,
  validateQuery
);

/**
 * @route GET /api/v1/database/:tenantId/status
 * @desc Get tenant database status
 * @access Private
 */
router.get(
  '/:tenantId/status',
  [
    param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  ],
  validateRequest,
  getDatabaseStatus
);

/**
 * @route GET /api/v1/database/:tenantId/history
 * @desc Get SQL query history for a tenant
 * @access Private
 */
router.get(
  '/:tenantId/history',
  [
    param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  ],
  validateRequest,
  getQueryHistory
);

/**
 * @route DELETE /api/v1/database/history/cleanup
 * @desc Clear old query history
 * @access Private
 */
router.delete(
  '/history/cleanup',
  clearOldQueryHistory
);

export default router;
