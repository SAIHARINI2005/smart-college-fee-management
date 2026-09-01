import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB, User, Student, AdminUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_college_fee_super_secret_jwt_key_2026';

// Configurable session inactivity timeout (default: 15 minutes)
export const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 15;
export function getInactivityTimeoutMs(): number {
  if (process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES) {
    const mins = parseFloat(process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES);
    if (!isNaN(mins) && mins > 0) {
      return Math.round(mins * 60 * 1000);
    }
  }
  if (process.env.SESSION_INACTIVITY_TIMEOUT_MS) {
    const ms = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MS, 10);
    if (!isNaN(ms) && ms > 0) {
      return ms;
    }
  }
  return DEFAULT_INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'STUDENT' | 'ADMIN' | 'FINANCE';
  name: string;
  studentId?: string;
  adminId?: string;
  rollNumber?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
  sessionInfo?: {
    lastActive: number;
    remainingMs: number;
    timeoutMs: number;
  };
}

export interface SessionRecord {
  lastActive: number;
  userId: string;
  email: string;
  role: string;
  createdAt: number;
}

// In-memory registry of active session tokens and their last user activity timestamps
const activeSessions = new Map<string, SessionRecord>();

// Helper to record / touch session activity
export function recordSessionActivity(token: string, payload: AuthPayload): void {
  const now = Date.now();
  activeSessions.set(token, {
    lastActive: now,
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    createdAt: activeSessions.get(token)?.createdAt || now
  });
}

// Helper to invalidate a session on logout or timeout
export function invalidateSession(token: string): void {
  activeSessions.delete(token);
}

// Helper to get session activity metrics
export function getSessionStatus(token: string): {
  active: boolean;
  remainingMs: number;
  timeoutMs: number;
  lastActive: number;
  timeoutMinutes: number;
} | null {
  const session = activeSessions.get(token);
  const timeoutMs = getInactivityTimeoutMs();
  if (!session) {
    return null;
  }
  const now = Date.now();
  const elapsedMs = now - session.lastActive;
  const remainingMs = Math.max(0, timeoutMs - elapsedMs);
  const active = elapsedMs <= timeoutMs;
  return {
    active,
    remainingMs,
    timeoutMs,
    lastActive: session.lastActive,
    timeoutMinutes: Math.round(timeoutMs / 60000)
  };
}

// Periodic cleanup of abandoned/expired session memory records (runs every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const maxExpiryAge = getInactivityTimeoutMs() * 2;
    for (const [tok, session] of activeSessions.entries()) {
      if (now - session.lastActive > maxExpiryAge) {
        activeSessions.delete(tok);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export function generateToken(payload: AuthPayload): string {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  recordSessionActivity(token, payload);
  return token;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: checkSessionInactivity
 * Validates whether the user's session has been inactive past the configured limit.
 * If inactive, revokes the session and sends a 401 response with `inactivityExpired: true`.
 * If active, updates the last active timestamp for rolling session security.
 */
export function checkSessionInactivity(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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

  const now = Date.now();
  const timeoutMs = getInactivityTimeoutMs();
  const session = activeSessions.get(token);

  if (session) {
    const elapsedMs = now - session.lastActive;
    if (elapsedMs > timeoutMs) {
      activeSessions.delete(token);
      const elapsedMins = Math.round(elapsedMs / 60000);
      const limitMins = Math.round(timeoutMs / 60000);
      console.warn(`[AUTH-SESSION] Session expired for ${session.email} due to ${elapsedMins}m of inactivity (limit: ${limitMins}m).`);
      
      res.status(401).json({
        success: false,
        sessionExpired: true,
        inactivityExpired: true,
        message: `Your session has expired after ${limitMins} minutes of inactivity for portal security. Please log in again.`
      });
      return;
    }

    // Refresh last active timestamp
    session.lastActive = now;
    req.sessionInfo = {
      lastActive: now,
      remainingMs: timeoutMs,
      timeoutMs
    };
  } else {
    // Session not yet in memory (e.g. initial request after server reboot or new token)
    activeSessions.set(token, {
      lastActive: now,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      createdAt: now
    });
    req.sessionInfo = {
      lastActive: now,
      remainingMs: timeoutMs,
      timeoutMs
    };
  }

  req.user = payload;
  next();
}

// Middleware: Authenticate JWT from Authorization header and enforce Inactivity Expiration
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  checkSessionInactivity(req, res, next);
}

// Middleware: Restrict to ADMIN or FINANCE role
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'FINANCE' && (role as any) !== 'FINANCE_OFFICER') {
      res.status(403).json({
        success: false,
        message: 'Access denied: Admin or Finance privileges required.'
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

