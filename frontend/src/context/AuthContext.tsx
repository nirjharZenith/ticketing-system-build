import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, getApiErrorMessage } from '../services/api';

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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tk: string) => {
    try {
      const response = await authAPI.verifyToken(tk);
      if (response.data.valid) {
        setToken(tk);
        const userResponse = await authAPI.getMe();
        setUser(userResponse.data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('[v0] Token verification failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
    } catch (error: any) {
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
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
