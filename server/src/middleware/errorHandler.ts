import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Ruta no encontrada' });
}

export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  void _next;
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = status === 500 ? 'Error interno del servidor' : err.message;

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, code: err.code });
  }

  res.status(status).json({ message, code: err.code });
}
