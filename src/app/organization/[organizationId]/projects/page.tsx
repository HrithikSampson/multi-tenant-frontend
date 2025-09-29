'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Projects from '@/components/pages/Projects';

export default function OrganizationProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.organizationId as string;

  useEffect(() => {
    if (!organizationId) {
      router.push('/workspace');
      return;
    }
  }, [organizationId, router]);

  if (!organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <Projects organizationId={organizationId} />;
}
