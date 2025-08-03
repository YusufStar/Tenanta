import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../utils/response';
import { PaginationQuery, CreateTenantRequest } from '../types';

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

/**
 * Validate create tenant request
 */
export const validateCreateTenant = (
  req: Request<{}, {}, CreateTenantRequest>,
  res: Response,
  next: NextFunction
): void => {
  const { name, slug, schemaName } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    const errorResponse = createErrorResponse(
      'Name is required and must be a non-empty string',
      'INVALID_NAME'
    );
    res.status(400).json(errorResponse);
    return;
  }

  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    const errorResponse = createErrorResponse(
      'Slug is required and must be a non-empty string',
      'INVALID_SLUG'
    );
    res.status(400).json(errorResponse);
    return;
  }

  if (!schemaName || typeof schemaName !== 'string' || schemaName.trim().length === 0) {
    const errorResponse = createErrorResponse(
      'Schema name is required and must be a non-empty string',
      'INVALID_SCHEMA_NAME'
    );
    res.status(400).json(errorResponse);
    return;
  }

  // Validate slug format (alphanumeric and hyphens only)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    const errorResponse = createErrorResponse(
      'Slug must contain only lowercase letters, numbers, and hyphens',
      'INVALID_SLUG_FORMAT'
    );
    res.status(400).json(errorResponse);
    return;
  }

  // Validate schema name format (alphanumeric and underscores only)
  const schemaNameRegex = /^[a-z0-9_]+$/;
  if (!schemaNameRegex.test(schemaName)) {
    const errorResponse = createErrorResponse(
      'Schema name must contain only lowercase letters, numbers, and underscores',
      'INVALID_SCHEMA_NAME_FORMAT'
    );
    res.status(400).json(errorResponse);
    return;
  }

  // Validate length constraints
  if (name.length > 255) {
    const errorResponse = createErrorResponse(
      'Name must be 255 characters or less',
      'NAME_TOO_LONG'
    );
    res.status(400).json(errorResponse);
    return;
  }

  if (slug.length > 100) {
    const errorResponse = createErrorResponse(
      'Slug must be 100 characters or less',
      'SLUG_TOO_LONG'
    );
    res.status(400).json(errorResponse);
    return;
  }

  if (schemaName.length > 63) {
    const errorResponse = createErrorResponse(
      'Schema name must be 63 characters or less',
      'SCHEMA_NAME_TOO_LONG'
    );
    res.status(400).json(errorResponse);
    return;
  }

  next();
}; 