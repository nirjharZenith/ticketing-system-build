import { Request, Response, NextFunction } from 'express';

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

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

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

    // Log to console in development
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
