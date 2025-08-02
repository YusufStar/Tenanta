import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: errors.array(),
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
};

// Common validation rules
export const commonValidations = {
  id: param('id').isUUID().withMessage('Invalid ID format'),
  
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  
  tenantId: param('tenantId').isUUID().withMessage('Invalid tenant ID format'),
  
  schemaName: [
    body('name').isString().trim().isLength({ min: 1, max: 63 }).withMessage('Schema name must be between 1 and 63 characters'),
    body('name').matches(/^[a-z][a-z0-9_]*$/).withMessage('Schema name must start with a letter and contain only lowercase letters, numbers, and underscores'),
  ],
  
  tableName: [
    body('name').isString().trim().isLength({ min: 1, max: 63 }).withMessage('Table name must be between 1 and 63 characters'),
    body('name').matches(/^[a-z][a-z0-9_]*$/).withMessage('Table name must start with a letter and contain only lowercase letters, numbers, and underscores'),
  ],
  
  email: body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  
  password: body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
}; 