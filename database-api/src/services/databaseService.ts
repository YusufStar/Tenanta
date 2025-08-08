import { logger } from '../shared/logger';
import { getDatabasePool } from '../config/database';

export class DatabaseService {
  static async initialize() {
    getDatabasePool(); // Initialize connection pool
    logger.info('✅ DatabaseService initialized successfully');
  }
} 