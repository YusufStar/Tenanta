// =============================================================================
// Shared Package - Main Export File
// =============================================================================

// Middleware exports
export * from './middleware/cors';
export * from './middleware/helmet';
export * from './middleware/compression';
export * from './middleware/morgan';
export * from './middleware/rateLimit';
export * from './middleware/validation';

// Utility exports
export * from './utils/crypto';
export * from './utils/jwt';
export * from './utils/validation';
export * from './utils/logger';
export * from './utils/response';
export * from './utils/redis';

// Type exports
export * from './types/api';
export * from './types/auth';
export * from './types/database';

// Constants
export * from './constants/errors';
export * from './constants/statusCodes';
export * from './constants/validation';

// =============================================================================
// Default exports for common use cases
// =============================================================================

import { setupMiddleware } from './middleware/setup';
import { createLogger } from './utils/logger';
import { createResponse } from './utils/response';
import { createRedisManager } from './utils/redis';

export const shared = {
  setupMiddleware,
  createLogger,
  createResponse,
  createRedisManager,
};

export default shared; 