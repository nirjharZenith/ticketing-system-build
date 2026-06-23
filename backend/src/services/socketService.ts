import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../middleware/logger';

let io: Server | null = null;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`[socket] Client connected: ${socket.id}`);

    // Clients can join a room specific to an organization to receive updates
    socket.on('join_org', (orgId: string) => {
      socket.join(`org_${orgId}`);
      logger.info(`[socket] Client ${socket.id} joined org_${orgId}`);
    });

    socket.on('leave_org', (orgId: string) => {
      socket.leave(`org_${orgId}`);
      logger.info(`[socket] Client ${socket.id} left org_${orgId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`[socket] Client disconnected: ${socket.id}`);
    });
  });

  logger.info('[socket] Socket.io initialized');
};

export const getSocketServer = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit an event to a specific organization room
 */
export const emitToOrg = (orgId: string, event: string, data: any) => {
  if (io) {
    io.to(`org_${orgId}`).emit(event, data);
    logger.info(`[socket] Emitted ${event} to org_${orgId}`);
  }
};
