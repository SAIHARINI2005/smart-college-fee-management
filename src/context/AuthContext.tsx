import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, DemoAccount } from '../types';
import { api } from '../services/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    credentialsOrIdentifier: { email?: string; identifier?: string; password?: string; role?: string } | string,
    password?: string,
    role?: string
  ) => Promise<void>;
  loginAsDemo: (role: 'STUDENT' | 'ADMIN') => Promise<void>;
  register: (studentData: any) => Promise<void>;
  logout: () => void;
  quickLoginAsDemo: (account: DemoAccount) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'college_fee_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            setToken(savedToken);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.warn('Session check failed, clearing token:', err);
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
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
      if (res.success && res.token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.token);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error(res.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
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
