import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';
import { logger } from '@tenanta/logging';

let wss: WebSocketServer;

export function setupWebSocket(server: Server): void {
  const wsPath = process.env.WS_PATH || '/ws';

  wss = new WebSocketServer({
    server,
    path: wsPath,
  });

  wss.on('connection', (ws: WebSocket, request) => {
    logger.info('WebSocket client connected', {
      ip: request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to Tenanta Database API WebSocket',
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.info('WebSocket message received:', message);
        
        // Handle different message types
        handleWebSocketMessage(ws, message);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString(),
        }));
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  wss.on('error', (error) => {
    logger.error('WebSocket server error:', error);
  });

  logger.info(`WebSocket server setup on path: ${wsPath}`);
}

function handleWebSocketMessage(ws: WebSocket, message: any): void {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
      }));
      break;
    
    case 'subscribe':
      // Handle subscription to real-time updates
      ws.send(JSON.stringify({
        type: 'subscribed',
        channel: message.channel,
        timestamp: new Date().toISOString(),
      }));
      break;
    
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type',
        timestamp: new Date().toISOString(),
      }));
  }
}

export function broadcastMessage(message: any): void {
  if (!wss) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  const messageStr = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export function getWebSocketServer(): WebSocketServer | null {
  return wss || null;
}

export async function createWebSocketServer(): Promise<Server> {
  const server = createHttpServer();
  setupWebSocket(server);
  return server;
} 