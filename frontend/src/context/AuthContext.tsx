import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { authAPI, getApiErrorMessage } from '../services/api';
import { normalizeUser } from '../utils/userDisplay';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionEpochRef = useRef(0);
  const pendingRequestRef = useRef<AbortController | null>(null);

  const cancelPendingRequest = useCallback(() => {
    pendingRequestRef.current?.abort();
    pendingRequestRef.current = null;
  }, []);

  const isSessionCurrent = useCallback(
    (epoch: number, sessionToken?: string) => {
      if (epoch !== sessionEpochRef.current) return false;
      if (sessionToken && localStorage.getItem(AUTH_STORAGE_KEY) !== sessionToken) return false;
      return true;
    },
    []
  );

  const commitSession = useCallback((sessionToken: string, nextUser: User | null) => {
    localStorage.setItem(AUTH_STORAGE_KEY, sessionToken);
    setToken(sessionToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    sessionEpochRef.current += 1;
    cancelPendingRequest();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setToken(null);
  }, [cancelPendingRequest]);

  const fetchCurrentUser = useCallback(async (sessionToken: string, signal: AbortSignal) => {
    const response = await authAPI.getMe(sessionToken, signal);
    return normalizeUser(response.data.user);
  }, []);

  const applySession = useCallback(async (sessionToken: string, epoch: number, seedUser?: User | null) => {
    cancelPendingRequest();
    const controller = new AbortController();
    pendingRequestRef.current = controller;

    if (seedUser) {
      commitSession(sessionToken, seedUser);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, sessionToken);
      setToken(sessionToken);
    }

    try {
      const currentUser = await fetchCurrentUser(sessionToken, controller.signal);
      if (controller.signal.aborted || !isSessionCurrent(epoch, sessionToken)) {
        return { aborted: true, success: false };
      }

      if (currentUser) {
        setUser(currentUser);
        setToken(sessionToken);
        localStorage.setItem(AUTH_STORAGE_KEY, sessionToken);
        return { aborted: false, success: true };
      } else {
        clearSession();
        return { aborted: false, success: false };
      }
    } catch (error: any) {
      if (controller.signal.aborted || !isSessionCurrent(epoch, sessionToken)) {
        return { aborted: true, success: false };
      }

      if (seedUser && isSessionCurrent(epoch, sessionToken)) {
        setUser(seedUser);
        return { aborted: false, success: true };
      }

      console.error('Failed to load current user:', error);
      clearSession();
      return { aborted: false, success: false };
    } finally {
      if (pendingRequestRef.current === controller) {
        pendingRequestRef.current = null;
      }
    }
  }, [cancelPendingRequest, clearSession, commitSession, fetchCurrentUser, isSessionCurrent]);

  const verifyStoredToken = useCallback(async (storedToken: string) => {
    const epoch = sessionEpochRef.current;

    try {
      const result = await applySession(storedToken, epoch);
      if (result && result.aborted) {
        return;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      if (isSessionCurrent(epoch, storedToken)) {
        clearSession();
      }
    }

    if (epoch === sessionEpochRef.current) {
      setLoading(false);
    }
  }, [applySession, clearSession, isSessionCurrent]);

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedToken) {
      verifyStoredToken(storedToken);
    } else {
      setLoading(false);
    }
  }, [verifyStoredToken]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;

      if (!event.newValue) {
        clearSession();
        return;
      }

      if (event.newValue !== token) {
        sessionEpochRef.current += 1;
        verifyStoredToken(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [token, verifyStoredToken, clearSession]);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!currentToken) {
      clearSession();
      return;
    }

    const epoch = sessionEpochRef.current;
    await applySession(currentToken, epoch);
  }, [applySession, clearSession]);

  const login = async (email: string, password: string) => {
    clearSession();
    const epoch = sessionEpochRef.current;

    try {
      const response = await authAPI.login(email, password);
      const { token: newToken, user: loginUser } = response.data;
      const seedUser = normalizeUser(loginUser);

      if (!newToken || !seedUser) {
        throw new Error('Login failed');
      }

      await applySession(newToken, epoch, seedUser);
    } catch (error: any) {
      if (epoch === sessionEpochRef.current) {
        clearSession();
      }
      throw new Error(getApiErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (email: string, name: string, password: string, confirmPassword: string) => {
    try {
      await authAPI.register(email, name, password, confirmPassword);
      await login(email, password);
    } catch (error: any) {
      throw new Error(getApiErrorMessage(error, 'Registration failed'));
    }
  };

  const logout = () => {
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (undefined === context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
