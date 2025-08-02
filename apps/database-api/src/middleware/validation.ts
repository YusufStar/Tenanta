import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../utils/response';
import { PaginationQuery } from '../types';

/**
 * Validate pagination query parameters
 */
export const validatePagination = (
  req: Request<{}, {}, {}, PaginationQuery>,
  res: Response,
  next: NextFunction
): void => {
  const { page, limit } = req.query;

  // Validate page parameter
  if (page !== undefined) {
    const pageNum = parseInt(page.toString());
    if (isNaN(pageNum) || pageNum < 1) {
             const errorResponse = createErrorResponse(
         'Page must be a positive integer',
         'INVALID_PAGE_PARAMETER'
       );
      res.status(400).json(errorResponse);
      return;
    }
  }

  // Validate limit parameter
  if (limit !== undefined) {
    const limitNum = parseInt(limit.toString());
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
             const errorResponse = createErrorResponse(
         'Limit must be a positive integer between 1 and 100',
         'INVALID_LIMIT_PARAMETER'
       );
      res.status(400).json(errorResponse);
      return;
    }
  }

  next();
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;
  
  if (!id) {
         const errorResponse = createErrorResponse(
       'ID parameter is required',
       'MISSING_ID_PARAMETER'
     );
    res.status(400).json(errorResponse);
    return;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
         const errorResponse = createErrorResponse(
       'Invalid ID format',
       'INVALID_ID_FORMAT'
     );
    res.status(400).json(errorResponse);
    return;
  }

  next();
}; 