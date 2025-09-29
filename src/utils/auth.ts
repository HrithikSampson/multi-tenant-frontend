import { tokenStore } from './tokenStore';

// Simple auth utilities to replace AuthContext
export const getStoredToken = (): string | null => {
  return tokenStore.getToken();
};

type User = {
  id: string;
  username: string;
};

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

export const setStoredToken = (token: string): void => {
  tokenStore.setToken(token);
};

export const setStoredUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const clearAuth = (): void => {
  tokenStore.clearAuth();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

export const isTokenValid = (token: string | null): boolean => {
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

export const isAuthenticated = (): boolean => {
  const token = tokenStore.getToken();
  const user = getStoredUser();
  return !!token && !!user && isTokenValid(token);
};
