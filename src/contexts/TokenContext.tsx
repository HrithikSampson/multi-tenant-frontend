'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenStore } from '@/utils/tokenStore';

interface TokenContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

interface TokenProviderProps {
  children: ReactNode;
}

export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(tokenStore.getRefreshToken());

  // Subscribe to token store changes
  useEffect(() => {
    const unsubscribe = tokenStore.subscribe(() => {
      setTokenState(tokenStore.getToken());
    });

    return unsubscribe;
  }, []);

  const setToken = (newToken: string | null) => {
    tokenStore.setToken(newToken);
  };

  const clearAuth = () => {
    tokenStore.clearAuth();
  };

  const value: TokenContextType = {
    token,
    setToken,
    clearAuth,
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = (): TokenContextType => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};
