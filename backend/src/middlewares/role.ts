import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user?.role || '')) {
      return res.status(403).json({ error: `Forbidden: Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}
