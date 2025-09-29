'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProjectSettings from '@/components/pages/ProjectSettings';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.organizationId as string;
  const projectId = params.projectId as string;

  useEffect(() => {
    if (!organizationId || !projectId) {
      router.push('/workspace');
      return;
    }
  }, [organizationId, projectId, router]);

  if (!organizationId || !projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <ProjectSettings organizationId={organizationId} projectId={projectId} />;
}
