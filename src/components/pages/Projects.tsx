import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { projectAPI } from '@/services/api';
import { Project } from '@/types';
import { FolderPlus, Plus, Settings, Eye, Edit, Trash2 } from 'lucide-react';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSlug, setNewProjectSlug] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { user, token, organizationId, logout } = useAuth();
  const router = useRouter();

  const fetchProjects = useCallback(async () => {
    console.log('fetchProjects called with:', { token: !!token, organizationId });
    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      setLoading(false);
      return;
    }
    
    try {
      const projs = await projectAPI.getProjects(token, organizationId);
      setProjects(projs);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [token, organizationId]);

  useEffect(() => {
    if (!organizationId) {
      router.push('/workspace');
      return;
    }
    fetchProjects();
  }, [organizationId, router, fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      setCreating(false);
      return;
    }

    try {
      await projectAPI.createProject(newProjectName, newProjectSlug, token, organizationId);
      setNewProjectName('');
      setNewProjectSlug('');
      setShowCreateForm(false);
      await fetchProjects();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      return;
    }

    try {
      await projectAPI.deleteProject(projectId, token, organizationId);
      await fetchProjects();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'EDITOR':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'VIEWER':
        return <Eye className="h-4 w-4 text-slate-500" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'EDITOR':
        return 'bg-blue-100 text-blue-800';
      case 'VIEWER':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
        <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
              <p className="text-slate-600">Manage your projects and tasks</p>
            </div>  
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/organization/settings')}
                className="flex items-center px-3 py-2 bg-amber-800 text-sm text-white hover:text-white hover:bg-amber-900 rounded-md transition-colors"
                title="Organization Settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Organization Settings
              </button>
              <span className="text-sm text-slate-500">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md p-6 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FolderPlus className="h-8 w-8 text-primary-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                    <p className="text-sm text-slate-500">/{project.slug}</p>
                  </div>
                </div>
                {project.user_role && (
                  <div className="flex items-center">
                    {getRoleIcon(project.user_role)}
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(project.user_role)}`}>
                      {project.user_role}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => router.push(`/projects/${project.id}/tasks`)}
                    className="flex items-center px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-md transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Tasks
                  </button>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => router.push(`/projects/${project.id}/settings`)}
                      className="p-2 text-slate-400 hover:text-slate-600"
                      title="Project Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-2 text-slate-400 hover:text-red-600"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {(project.user_role === 'EDITOR' || !project.user_role) && (
                  <button
                    onClick={() => router.push(`/projects/${project.id}/tasks?create=true`)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-amber-800 text-white rounded-md hover:bg-primary-700 transition-colors text-base font-semibold shadow-md hover:shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Task
                  </button>
                )}
              </div>
            </div>
          ))}

          <div
            onClick={() => setShowCreateForm(true)}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-slate-300 hover:border-primary-400"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <Plus className="h-8 w-8 text-slate-400 mb-2" />
              <h3 className="text-lg font-medium text-slate-900">Create Project</h3>
              <p className="text-sm text-slate-500 text-center">Start a new project</p>
            </div>
          </div>
        </div>

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
              
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={newProjectSlug}
                      onChange={(e) => setNewProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="project-slug"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
