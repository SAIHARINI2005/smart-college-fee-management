import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB, User, Student, AdminUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_college_fee_super_secret_jwt_key_2026';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  name: string;
  studentId?: string;
  adminId?: string;
  rollNumber?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (err) {
    return null;
  }
}

// Middleware: Authenticate JWT from Authorization header
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required. Please log in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ success: false, message: 'Invalid or expired authentication token.' });
    return;
  }

  req.user = payload;
  next();
}

// Middleware: Restrict to ADMIN role
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access denied: Admin privileges required.'
      });
      return;
    }
    next();
  });
}

// Middleware: Restrict to STUDENT role
export function requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'STUDENT') {
      res.status(403).json({
        success: false,
        message: 'Access denied: Student access required.'
      });
      return;
    }
    next();
  });
}
