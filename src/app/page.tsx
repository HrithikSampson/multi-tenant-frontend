'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useToken } from '@/contexts/TokenContext';
import { isAuthenticated } from '@/utils/auth';

export default function Home() {
  const router = useRouter();
  const { token } = useToken();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/workspace');
    } else {
      router.push('/login');
    }
  }, [router, token]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
    </div>
  );
}