import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { taskAPI, projectAPI } from '@/services/api';
import { Task, Project } from '@/types';
import { ArrowLeft, Plus, CheckCircle, Circle, Clock, Trash2, User, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (taskId: string, newStatus: 'TODO' | 'INPROGRESS' | 'DONE') => void;
  onDelete: (taskId: string) => void;
  canEdit: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus, onDelete, canEdit }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TODO':
        return <Circle className="h-4 w-4 text-slate-400" />;
      case 'INPROGRESS':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'DONE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getNextStatus = (currentStatus: string): 'TODO' | 'INPROGRESS' | 'DONE' => {
    switch (currentStatus) {
      case 'TODO':
        return 'INPROGRESS';
      case 'INPROGRESS':
        return 'DONE';
      case 'DONE':
        return 'TODO';
      default:
        return 'TODO';
    }
  };

  const getPrevStatus = (currentStatus: string): 'TODO' | 'INPROGRESS' | 'DONE' => {
    switch (currentStatus) {
      case 'TODO':
        return 'DONE';
      case 'INPROGRESS':
        return 'TODO';
      case 'DONE':
        return 'INPROGRESS';
      default:
        return 'DONE';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon(task.status)}
          <h4 className="font-medium text-slate-900 text-sm">{task.title}</h4>
        </div>
        {canEdit && (
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-slate-400 hover:text-red-600"
            title="Delete Task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {task.description && (
        <p className="text-slate-600 text-sm mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          {task.assignee_username && (
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              {task.assignee_username}
            </div>
          )}
          {task.due_date && (
            <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onUpdateStatus(task.id, getPrevStatus(task.status))}
            className="p-1 text-slate-400 hover:text-slate-600"
            title="Move left"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={() => onUpdateStatus(task.id, getNextStatus(task.status))}
            className="p-1 text-slate-400 hover:text-slate-600"
            title="Move right"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProjectTasksProps {
  organizationId: string;
  projectId: string;
}

const ProjectTasks: React.FC<ProjectTasksProps> = ({ organizationId, projectId }) => {
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [creating, setCreating] = useState(false);
  const [projectMembers, setProjectMembers] = useState<{id: string; username: string}[]>([]);
  console.log({projectMembers})
  const router = useRouter();

  useEffect(() => {
    if (!projectId) return;
    
    fetchProject();
    fetchTasks();
    fetchProjectMembers();
    
    // Check if create=true is in URL params
    if (searchParams.get('create') === 'true') {
      setShowCreateForm(true);
    }
  }, [projectId, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProject = async () => {
    try {
      const proj = await projectAPI.getProject(projectId, organizationId);
      setProject(proj);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch project');
    }
  };

  const fetchTasks = async () => {
    try {
      const taskList = await taskAPI.getTasks(projectId, organizationId);
      setTasks(taskList);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const members = await projectAPI.getProjectMembers(projectId, organizationId);
      setProjectMembers(members);
    } catch (err: unknown) {
      console.error('Failed to fetch project members:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      await taskAPI.createTask(projectId, {
        title: newTaskTitle,
        description: newTaskDescription,
        assigneeId: newTaskAssigneeId || undefined,
      }, organizationId);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssigneeId('');
      setShowCreateForm(false);
      await fetchTasks();
      
      // Remove create=true from URL
      router.replace(`/organization/${organizationId}/projects/${projectId}/tasks`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'TODO' | 'INPROGRESS' | 'DONE') => {
    try {
      await taskAPI.updateTask(projectId, taskId, { status: newStatus }, organizationId);
      await fetchTasks();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await taskAPI.deleteTask(projectId, taskId, organizationId);
      await fetchTasks();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to delete task');
    }
  };

  console.log('Project:', project);
  console.log('User Role:', project?.user_role);
  console.log('User Role Type:', typeof project?.user_role);
  console.log('User Role === EDITOR:', project?.user_role === 'EDITOR');
  console.log('User Role is falsy:', !project?.user_role);
  // Only users with 'EDITOR' role or no role (project creator) can create tasks
  const canCreateTask = project?.user_role === 'EDITOR' || !project?.user_role;
  console.log('Can Create Task:', canCreateTask);
  console.log('Project exists:', !!project);
  console.log('Project ID:', project?.id);

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
                onClick={() => router.push(`/organization/${organizationId}/projects`)}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{project?.name}</h1>
                <p className="text-slate-600">/{project?.slug}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/organization/${organizationId}/projects/${projectId}/settings`)}
                className="flex items-center px-4 py-2 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors"
                title="Project Settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Project Settings
              </button>
              
              {canCreateTask && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center px-6 py-3 bg-primary-600 bg-amber-950 text-white rounded-md hover:bg-primary-700 transition-colors text-base font-semibold shadow-md hover:shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Task
                </button>
              )}
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

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <CheckCircle className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks yet</h3>
            <p className="text-slate-500 mb-4">Get started by creating your first task</p>
            
            
            {canCreateTask && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center mx-auto px-6 py-3 bg-amber-800 text-white rounded-md hover:bg-amber-900 transition-colors text-base font-semibold shadow-md hover:shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Task
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TODO Column */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                  <Circle className="h-5 w-5 mr-2 text-slate-400" />
                  TODO
                </h3>
                <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-full text-sm">
                  {tasks.filter(task => task.status === 'TODO').length}
                </span>
              </div>
              <div className="space-y-3">
                {tasks
                  .filter(task => task.status === 'TODO')
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDelete={handleDeleteTask}
                      canEdit={canCreateTask}
                    />
                  ))}
              </div>
            </div>

            {/* IN PROGRESS Column */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  IN PROGRESS
                </h3>
                <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-full text-sm">
                  {tasks.filter(task => task.status === 'INPROGRESS').length}
                </span>
              </div>
              <div className="space-y-3">
                {tasks
                  .filter(task => task.status === 'INPROGRESS')
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDelete={handleDeleteTask}
                      canEdit={canCreateTask}
                    />
                  ))}
              </div>
            </div>

            {/* DONE Column */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  DONE
                </h3>
                <span className="bg-green-200 text-green-700 px-2 py-1 rounded-full text-sm">
                  {tasks.filter(task => task.status === 'DONE').length}
                </span>
              </div>
              <div className="space-y-3">
                {tasks
                  .filter(task => task.status === 'DONE')
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDelete={handleDeleteTask}
                      canEdit={canCreateTask}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg text-cyan-950 font-semibold mb-4">Create New Task</h3>
              
              <form onSubmit={handleCreateTask}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter task description (optional)"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Assignee
                    </label>
                    <select
                      value={newTaskAssigneeId}
                      onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">No assignee</option>
                      {projectMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.username}
                        </option>
                      ))}
                    </select>
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
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md hover:bg-primary-700 disabled:opacity-50"
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

export default ProjectTasks;
