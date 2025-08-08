import dotenv from 'dotenv';
import { createApiServer } from './server';
import { createWebSocketServer } from './websocket';
import { logger } from './shared/logger';

// Load environment variables
dotenv.config();

const API_PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

async function startServers() {
  try {
    // Start API Server
    const apiServer = await createApiServer();
    apiServer.listen(API_PORT, () => {
      logger.info(`🚀 Database API server running on port ${API_PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API Base URL: http://localhost:${API_PORT}/api/v1`);
    });

    // Start WebSocket Server
    const wsServer = await createWebSocketServer();
    wsServer.listen(WS_PORT, () => {
      logger.info(`🔌 WebSocket server running on port ${WS_PORT}`);
      logger.info(`🔗 WebSocket URL: ws://localhost:${WS_PORT}/ws`);
    });
  } catch (error) {
    logger.error('Failed to start servers:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServers(); 