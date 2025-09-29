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
  const [token, setTokenState] = useState<string | null>(null);

  // Subscribe to token store changes and handle refresh
  useEffect(() => {
    const unsubscribe = tokenStore.subscribe(() => {
      setTokenState(tokenStore.getToken());
    });

    // Initialize token state and try to refresh if needed
    const initializeToken = async () => {
      console.log('TokenContext: Initializing token...');
      const currentToken = tokenStore.getToken();
      console.log('TokenContext: Current token:', currentToken);
      if (currentToken) {
        setTokenState(currentToken);
      } else {
        console.log('TokenContext: No current token, attempting refresh...');
        // Try to refresh token if no current token
        const refreshedToken = await tokenStore.getRefreshToken();
        console.log('TokenContext: Refreshed token:', refreshedToken);
        setTokenState(refreshedToken);
      }
    };

    initializeToken();

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
