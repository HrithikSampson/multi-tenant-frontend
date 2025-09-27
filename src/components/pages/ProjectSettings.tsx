'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { projectAPI, authAPI } from '@/services/api';
import { Project } from '@/types';
import { ArrowLeft, Plus, UserPlus, Trash2, Crown, Edit, Eye } from 'lucide-react';

interface ProjectMember {
  id: string;
  user_id: string;
  username: string;
  role: 'EDITOR' | 'VIEWER';
  joined_at: string;
}

const ProjectSettings: React.FC = () => {
  const params = useParams();
  const projectId = params?.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [adding, setAdding] = useState(false);
  const [searchResults, setSearchResults] = useState<{id: string; username: string}[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const { token, organizationId } = useAuth();
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!projectId) return;
    
    fetchProject();
    fetchMembers();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProject = async () => {
    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      return;
    }
    
    try {
      const proj = await projectAPI.getProject(projectId!, token, organizationId);
      setProject(proj);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch project');
    }
  };

  const fetchMembers = async () => {
    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      setLoading(false);
      return;
    }
    
    try {
      const memberList = await projectAPI.getProjectMembers(projectId!, token, organizationId);
      setMembers(memberList);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !token) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    try {
      const users = await authAPI.searchUsers(query, token, 10);
      setSearchResults(users);
      setShowSearchResults(true);
    } catch {
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearching(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMemberUsername(value);
    setShowSearchResults(false);
    setSearchResults([]);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const selectUser = (selectedUser: {id: string; username: string}) => {
    setNewMemberUsername(selectedUser.username);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');

    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      setAdding(false);
      return;
    }

    try {
      // First, find the user by username
      const user = await authAPI.findUserByUsername(newMemberUsername, token);
      const userId = user.id;

      // Then add the user to the project
      await projectAPI.addProjectMember(projectId!, {
        userId: userId,
        role: newMemberRole,
      }, token, organizationId);
      
      setNewMemberUsername('');
      setNewMemberRole('VIEWER');
      setShowAddMemberForm(false);
      setSearchResults([]);
      setShowSearchResults(false);
      await fetchMembers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: 'EDITOR' | 'VIEWER') => {
    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      return;
    }

    try {
      await projectAPI.updateProjectMemberRole(projectId!, memberId, newRole, token, organizationId);
      await fetchMembers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    if (!token || !organizationId) {
      setError('No authentication token or organization available');
      return;
    }

    try {
      await projectAPI.removeProjectMember(projectId!, memberId, token, organizationId);
      await fetchMembers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'EDITOR':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'VIEWER':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Crown className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'EDITOR':
        return 'bg-blue-100 text-blue-800';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const canManageMembers = project?.user_role === 'EDITOR' || !project?.user_role;

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
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/projects')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Project Settings</h1>
                <p className="text-slate-600">{project?.name} - /{project?.slug}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Project Members Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <UserPlus className="h-6 w-6 text-slate-600 mr-3" />
              <h2 className="text-lg font-semibold text-slate-900">Project Members</h2>
            </div>
            
            {canManageMembers && (
              <button
                onClick={() => setShowAddMemberForm(true)}
                className="flex items-center px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No members yet</h3>
              <p className="text-slate-500 mb-4">Add members to collaborate on this project</p>
              {canManageMembers && (
                <button
                  onClick={() => setShowAddMemberForm(true)}
                  className="flex items-center mx-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Member
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {member.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-slate-900">{member.username}</h4>
                        <div className="flex items-center ml-2">
                          {getRoleIcon(member.role)}
                          <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {canManageMembers && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as 'EDITOR' | 'VIEWER')}
                        className="text-sm border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-slate-400 hover:text-red-600"
                        title="Remove Member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddMemberForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Project Member</h3>
              
              <form onSubmit={handleAddMember}>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newMemberUsername}
                      onChange={handleUsernameChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Type at least 2 characters to search..."
                      required
                    />
                    
                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => selectUser(user)}
                            className="px-3 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-200 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-primary-600 font-medium text-sm">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{user.username}</p>
                                <p className="text-xs text-slate-500">Click to select</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No Results */}
                    {showSearchResults && searchResults.length === 0 && newMemberUsername.trim().length >= 2 && !searching && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg">
                        <div className="px-3 py-2 text-sm text-slate-500">
                          No users found matching &quot;{newMemberUsername}&quot;
                        </div>
                      </div>
                    )}
                    
                    {/* Loading */}
                    {searching && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg">
                        <div className="px-3 py-2 text-sm text-slate-500 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                          Searching...
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as 'EDITOR' | 'VIEWER')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="VIEWER">Viewer - Can view tasks and projects</option>
                      <option value="EDITOR">Editor - Can create and edit tasks</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberForm(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-800 rounded-md hover:bg-amber-900 disabled:opacity-50"
                  >
                    {adding ? 'Adding...' : 'Add Member'}
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

export default ProjectSettings;
