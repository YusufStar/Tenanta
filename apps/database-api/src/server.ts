import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer } from 'http';
import { logger } from '@tenanta/logging';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupDatabase } from './config/database';
import { setupRedis } from './config/redis';
import { DatabaseService } from './services/databaseService';

import tenantRoutes from './routes/tenantRoutes';
import logRoutes from './routes/logRoutes';
import schemaRoutes from './routes/schemaRoutes';

export async function createApiServer() {
  const app = express();

  // Initialize database and Redis connections
  await setupDatabase();
  await setupRedis();
  
  // Initialize DatabaseService
  try {
    await DatabaseService.initialize();
    logger.info('✅ DatabaseService initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize DatabaseService:', error);
    throw error;
  }
  
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);

  // Compression
  app.use(compression());

  // Logging
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
  app.use(requestLogger);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API routes prefix
  const apiPrefix = process.env.API_PREFIX || '/api';
  const apiVersion = process.env.API_VERSION || 'v1';
  const basePath = `${apiPrefix}/${apiVersion}`; // Will be used when routes are added

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'database-api',
      version: '1.0.0'
    });
  });

  // API routes
  app.use(`${basePath}/tenants`, tenantRoutes);
  app.use(`${basePath}/schemas`, schemaRoutes);
  app.use(`${basePath}/logs`, logRoutes);

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return createHttpServer(app);
} 