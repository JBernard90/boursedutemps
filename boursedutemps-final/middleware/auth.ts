import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // CORRECTION : sendStatus(401) renvoyait du texte brut "Unauthorized"
  // On renvoie maintenant du JSON strict
  if (!token) {
    return res.status(401).json({
      error: 'Token d\'authentification manquant',
      success: false,
      code: 'NO_TOKEN',
    });
  }

  const secret = process.env.JWT_SECRET || 'fallback_secret';

  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Session expirée, veuillez vous reconnecter',
          success: false,
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(403).json({
        error: 'Token invalide',
        success: false,
        code: 'INVALID_TOKEN',
      });
    }
    req.user = user;
    next();
  });
};
