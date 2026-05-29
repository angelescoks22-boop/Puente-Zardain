import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

export function validateBody<T extends ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join('. ');
      return res.status(400).json({
        message: issues || 'Datos inválidos',
        errors: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };
}
