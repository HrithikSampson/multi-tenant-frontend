'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, token, refreshToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Pages that don't require authentication
  const publicPages = ['/login', '/register'];
  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      // If it's a public page, allow access without authentication
      if (isPublicPage) {
        setIsChecking(false);
        return;
      }

      // If no token is available, redirect immediately to login
      if (!token) {
        console.log('No token available, redirecting to login');
        setShouldRedirect(true);
        return;
      }

      // If we have a token but user is not authenticated, try to refresh
      if (token && !isAuthenticated) {
        console.log('Token exists but user not authenticated, attempting refresh...');
        try {
          const refreshSuccess = await refreshToken();
          if (!refreshSuccess) {
            console.log('Token refresh failed, redirecting to login');
            setShouldRedirect(true);
            return;
          }
          console.log('Token refresh successful');
        } catch (error) {
          console.log('Token refresh error:', error);
          setShouldRedirect(true);
          return;
        }
      }
      
      setIsChecking(false);
    };

    checkAuth();
  }, [token, isAuthenticated, refreshToken, isPublicPage]);

  // Handle redirect in a separate useEffect
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/login');
    }
  }, [shouldRedirect, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If it's a public page, always render children
  if (isPublicPage) {
    return <>{children}</>;
  }

  // For protected pages, check authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
