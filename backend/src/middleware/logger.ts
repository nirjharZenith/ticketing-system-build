import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number; // in ms
  ip: string;
  userId?: string;
  error?: string;
}

const logs: RequestLog[] = [];
const MAX_LOGS = 1000;

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-ID', reqId);
  (req as any).requestId = reqId;
  next();
};

export const createLogger = (req?: Request | null) => {
  const requestId = req ? (req as any).requestId : undefined;
  
  const formatLog = (level: string, message: string, meta?: any) => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      requestId,
      message,
      ...(meta && { meta })
    });
  };

  return {
    info: (msg: string, meta?: any) => console.log(formatLog('info', msg, meta)),
    warn: (msg: string, meta?: any) => console.warn(formatLog('warn', msg, meta)),
    error: (msg: string, meta?: any) => console.error(formatLog('error', msg, meta)),
    debug: (msg: string, meta?: any) => {
      if (process.env.NODE_ENV !== 'production') console.debug(formatLog('debug', msg, meta));
    }
  };
};

// Default app logger
export const logger = createLogger();

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const reqLogger = createLogger(req);

  // Capture the original send function
  const originalSend = res.send;
  res.send = function (data: any) {
    // Restore send function
    res.send = originalSend;

    const duration = Date.now() - startTime;
    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userId: (req as any).user?.id,
    };

    // Add to logs
    logs.push(log);
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      const statusColor =
        res.statusCode >= 500
          ? '\x1b[31m'
          : res.statusCode >= 400
            ? '\x1b[33m'
            : '\x1b[32m';
      const reset = '\x1b[0m';
      console.log(
        `[v0] ${statusColor}${log.status}${reset} ${log.method} ${log.path} ${log.duration}ms`
      );
    } else {
      reqLogger.info('HTTP Request', log);
    }

    return res.send(data);
  };

  next();
};

export const getRequestLogs = () => {
  return logs;
};

export const clearRequestLogs = () => {
  logs.length = 0;
};

// Error tracking
interface ErrorMetric {
  code: string;
  count: number;
  lastOccurrence: string;
}

const errorMetrics: { [key: string]: ErrorMetric } = {};

export const trackError = (code: string) => {
  if (!errorMetrics[code]) {
    errorMetrics[code] = {
      code,
      count: 0,
      lastOccurrence: new Date().toISOString(),
    };
  }
  errorMetrics[code].count++;
  errorMetrics[code].lastOccurrence = new Date().toISOString();
};

export const getErrorMetrics = () => {
  return Object.values(errorMetrics);
};

export const clearErrorMetrics = () => {
  Object.keys(errorMetrics).forEach((key) => delete errorMetrics[key]);
};

// Health metrics
export interface HealthMetrics {
  uptime: number;
  timestamp: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}

const startTime = Date.now();

export const getHealthMetrics = (): HealthMetrics => {
  const totalRequests = logs.length;
  const totalErrors = Object.values(errorMetrics).reduce((sum, m) => sum + m.count, 0);
  const averageResponseTime =
    logs.length > 0 ? logs.reduce((sum, l) => sum + l.duration, 0) / logs.length : 0;

  return {
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    requestCount: totalRequests,
    errorCount: totalErrors,
    averageResponseTime: Math.round(averageResponseTime),
  };
};
