import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, DemoAccount } from '../types';
import { api } from '../services/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionTimeoutMessage: string | null;
  dismissSessionTimeout: () => void;
  login: (
    credentialsOrIdentifier: { email?: string; identifier?: string; password?: string; role?: string } | string,
    password?: string,
    role?: string
  ) => Promise<void>;
  loginAsDemo: (role: 'STUDENT' | 'ADMIN') => Promise<void>;
  register: (studentData: any) => Promise<{ success: boolean; message: string; email?: string; role?: string }>;
  logout: () => void;
  quickLoginAsDemo: (account: DemoAccount) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'college_fee_auth_token';
const DEFAULT_INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const PING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes heartbeat for active users

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(Date.now());

  const handleSessionExpired = useCallback((message?: string) => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSessionTimeoutMessage(
      message || 'Your session expired due to 15 minutes of inactivity for security. Please log in again.'
    );
  }, []);

  const dismissSessionTimeout = useCallback(() => {
    setSessionTimeoutMessage(null);
  }, []);

  // Track user interactions to maintain active session
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, handleUserActivity, { passive: true }));

    // Listen for custom API interceptor event for inactivity expiration
    const handleInactivityEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      handleSessionExpired(customEvent.detail?.message);
    };
    window.addEventListener('portal:session-inactivity-expired', handleInactivityEvent);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      window.removeEventListener('portal:session-inactivity-expired', handleInactivityEvent);
    };
  }, [handleSessionExpired]);

  // Periodic inactivity check & heartbeat updater
  useEffect(() => {
    if (!token || !user) return;

    const intervalId = setInterval(async () => {
      const now = Date.now();
      const elapsedSinceActivity = now - lastActivityRef.current;

      // 1. Check if user exceeded client-side inactivity threshold
      if (elapsedSinceActivity >= DEFAULT_INACTIVITY_LIMIT_MS) {
        console.warn('[AUTH-CLIENT] Inactivity limit reached. Terminating session.');
        try {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        } catch {
          // ignore
        }
        handleSessionExpired(
          'Your session expired due to 15 minutes of inactivity for portal security. Please log in again.'
        );
        return;
      }

      // 2. If user is actively interacting and ping interval elapsed, refresh session on server
      if (now - lastPingRef.current >= PING_INTERVAL_MS && elapsedSinceActivity < PING_INTERVAL_MS) {
        lastPingRef.current = now;
        try {
          await api.pingSession();
        } catch (err: any) {
          // If server reported session expired
          if (err.message && (err.message.includes('expired') || err.message.includes('inactivity'))) {
            handleSessionExpired(err.message);
          }
        }
      }
    }, 15000); // check every 15 seconds

    return () => clearInterval(intervalId);
  }, [token, user, handleSessionExpired]);

  // Load user on startup
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            setToken(savedToken);
            lastActivityRef.current = Date.now();
            lastPingRef.current = Date.now();
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        } catch (err: any) {
          console.warn('Session check failed:', err);
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          if (err.message && (err.message.includes('expired') || err.message.includes('inactivity'))) {
            setSessionTimeoutMessage('Your previous session has expired. Please sign in again.');
          }
        }
      }
      setIsLoading(false);
    }

    loadUser();
  }, []);

  const login = async (
    credentialsOrIdentifier: { email?: string; identifier?: string; password?: string; role?: string } | string,
    password?: string,
    role?: string
  ) => {
    setIsLoading(true);
    try {
      let payload: { email: string; password: string; role?: string };
      if (typeof credentialsOrIdentifier === 'string') {
        payload = {
          email: credentialsOrIdentifier,
          password: password || 'Student@123',
          role: role || 'STUDENT'
        };
      } else {
        payload = {
          email: credentialsOrIdentifier.email || credentialsOrIdentifier.identifier || '',
          password: credentialsOrIdentifier.password || password || '',
          role: credentialsOrIdentifier.role || role
        };
      }
      const res = await api.login(payload);
      if (res.success && res.token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.token);
        setToken(res.token);
        setUser(res.user);
        setSessionTimeoutMessage(null);
        lastActivityRef.current = Date.now();
        lastPingRef.current = Date.now();
      } else {
        throw new Error(res.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemo = async (demoRole: 'STUDENT' | 'ADMIN') => {
    if (demoRole === 'ADMIN') {
      await login({
        email: 'admin@college.edu',
        password: 'Admin@123',
        role: 'ADMIN'
      });
    } else {
      await login({
        email: '21CS101',
        password: 'Student@123',
        role: 'STUDENT'
      });
    }
  };

  const register = async (studentData: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(studentData);
      if (!res.success) {
        throw new Error(res.message || 'Registration failed.');
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      try {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` }
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const quickLoginAsDemo = async (account: DemoAccount) => {
    setIsLoading(true);
    try {
      const res = await api.login({
        email: account.email,
        password: account.password,
        role: account.role
      });
      if (res.success && res.token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.token);
        setToken(res.token);
        setUser(res.user);
        setSessionTimeoutMessage(null);
        lastActivityRef.current = Date.now();
        lastPingRef.current = Date.now();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.warn('Failed to refresh user', err);
    }
  };

  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        sessionTimeoutMessage,
        dismissSessionTimeout,
        login,
        loginAsDemo,
        register,
        logout,
        quickLoginAsDemo,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
