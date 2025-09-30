'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { activityAPI } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Bell, AlertTriangle, Megaphone, Eye, Filter, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Activity {
  id: string;
  kind: string;
  message: string;
  objectType?: string;
  objectId?: string;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    username: string;
  };
}

interface ActivityFeedProps {
  organizationId: string;
  roomKey: string;
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  organizationId, 
  roomKey, 
  className = '' 
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedKind, setSelectedKind] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  
  // WebSocket connection
  const { isConnected, connectionError, on, off } = useWebSocket({ 
    roomKey, 
    enabled: !!roomKey 
  });

  const fetchActivities = useCallback(async (pageNum: number = 1, kind?: string, append: boolean = false) => {
    try {
      setError('');
      if (pageNum === 1) setLoading(true);
      
      const response = await activityAPI.getActivities(organizationId, pageNum, 20, kind, roomKey);
      
      const newActivities = response.activities || [];
      
      if (append) {
        setActivities(prev => [...prev, ...newActivities]);
      } else {
        setActivities(newActivities);
      }
      
      setHasMore(newActivities.length === 20);
      setPage(pageNum);
    } catch (err: unknown) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, roomKey]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities(1, selectedKind || undefined, false);
  }, [fetchActivities, selectedKind]);

  const handleLoadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchActivities(page + 1, selectedKind || undefined, true);
    }
  }, [fetchActivities, loading, hasMore, page, selectedKind]);

  const handleKindFilter = useCallback(async (kind: string) => {
    setSelectedKind(kind);
    await fetchActivities(1, kind || undefined, false);
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // WebSocket event handlers
  useEffect(() => {
    const handleNewActivity = (data: { activity: Activity; timestamp: string }) => {
      console.log('New activity received:', data);
      setActivities(prev => [data.activity, ...prev]);
    };

    const handleActivityUpdate = (data: { activity: Activity; timestamp: string }) => {
      console.log('Activity updated:', data);
      setActivities(prev => 
        prev.map(activity => 
          activity.id === data.activity.id ? data.activity : activity
        )
      );
    };

    const handleActivityDeletion = (data: { activityId: string; timestamp: string }) => {
      console.log('Activity deleted:', data);
      setActivities(prev => 
        prev.filter(activity => activity.id !== data.activityId)
      );
    };

    const handleSystemMessage = (data: { message: string; kind: string; timestamp: string }) => {
      console.log('System message:', data);
      // You could show a toast notification here
    };

    // Set up event listeners
    on('new-activity', handleNewActivity);
    on('activity-updated', handleActivityUpdate);
    on('activity-deleted', handleActivityDeletion);
    on('system-message', handleSystemMessage);

    // Cleanup
    return () => {
      off('new-activity', handleNewActivity);
      off('activity-updated', handleActivityUpdate);
      off('activity-deleted', handleActivityDeletion);
      off('system-message', handleSystemMessage);
    };
  }, [on, off]);

  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ALERT':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'ANNOUNCE':
        return <Megaphone className="h-4 w-4 text-blue-500" />;
      case 'SHOW':
        return <Eye className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const activityKinds = [
    { value: '', label: 'All Activities' },
    { value: 'NOTIFY', label: 'Notifications' },
    { value: 'ANNOUNCE', label: 'Announcements' },
    { value: 'WARN', label: 'Warnings' },
    { value: 'ALERT', label: 'Alerts' },
    { value: 'SHOW', label: 'Shows' },
  ];

  if (loading && activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <div title="Connected">
                  <Wifi className="h-4 w-4 text-green-500" />
                </div>
              ) : (
                <div title="Disconnected">
                  <WifiOff className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {connectionError && (
              <span className="text-xs text-red-500" title={connectionError}>
                Connection Error
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Filter */}
        <div className="mt-3 flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={selectedKind}
            onChange={(e) => handleKindFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {activityKinds.map(kind => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="p-4 text-center text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {activities.length === 0 && !loading ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No activities yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.kind)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.actor.username}</span>
                        {' '}{activity.message}
                      </p>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    {activity.meta && Object.keys(activity.meta).length > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        {Object.entries(activity.meta).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
