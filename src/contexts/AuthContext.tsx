'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { authAPI } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  });
  const [organizationId, setOrganizationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('organization_id');
    }
    return null;
  });

  const isTokenValid = (token: string | null): boolean => {
    if (!token) return false;

    try {
      // Decode JWT token to check expiration
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      if (!payload || !payload.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  };

  // No localStorage - everything is managed in context state

  // Check token validity periodically
  useEffect(() => {
    if (!token) return;

    const checkTokenValidity = () => {
      if (!isTokenValid(token)) {
        // Token expired, logout user
        logout();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTokenValidity, 30000);
    
    return () => clearInterval(interval);
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      const { accessToken, user: userData } = response;
      
      setToken(accessToken);
      setUser(userData);
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setOrganizationId(null);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('organization_id');
    }
  };

  const setOrganization = (orgId: string) => {
    setOrganizationId(orgId);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('organization_id', orgId);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await authAPI.refresh();
      const { accessToken } = response;
      
      setToken(accessToken);
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', accessToken);
      }
      
      return true;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return false;
    }
  };

  const isAuthenticated = !!token && !!user && isTokenValid(token);

  // Function to update token when it's refreshed by backend
  const updateToken = (newToken: string) => {
    setToken(newToken);
  };

  const value: AuthContextType = {
    user,
    token,
    organizationId,
    login,
    logout,
    setOrganization,
    setUser,
    setToken,
    updateToken,
    isAuthenticated,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
