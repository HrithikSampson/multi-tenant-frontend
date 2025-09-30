import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Activity } from '@/types';

interface UseWebSocketProps {
  roomKey: string;
  enabled?: boolean;
}

interface WebSocketEvents {
  'new-activity': (data: { activity: Activity; timestamp: string }) => void;
  'activity-updated': (data: { activity: Activity; timestamp: string }) => void;
  'activity-deleted': (data: { activityId: string; timestamp: string }) => void;
  'system-message': (data: { message: string; kind: string; timestamp: string }) => void;
  'joined-room': (data: { roomKey: string; message: string }) => void;
  'left-room': (data: { roomKey: string; message: string }) => void;
  'activity-filter-changed': (data: { roomKey: string; kind?: string }) => void;
}

export const useWebSocket = ({ roomKey, enabled = true }: UseWebSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !roomKey) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://multi-tenant-backend-ugnt-80ksha87c-hrithiks-projects-a05d4764.vercel.app/api';
    const WS_URL = API_URL.replace('/api', '').replace('https://', 'wss://').replace('http://', 'ws://');

    console.log('Connecting to WebSocket:', WS_URL);

    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Join the organization room
      newSocket.emit('join-organization', roomKey);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('joined-room', (data) => {
      console.log('Joined room:', data);
    });

    newSocket.on('left-room', (data) => {
      console.log('Left room:', data);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (roomKey) {
        newSocket.emit('leave-organization', roomKey);
      }
      newSocket.disconnect();
      setSocket(null);
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [roomKey, enabled]);

  const emit = (event: string, data?: unknown) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = <K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event as string, callback as (...args: unknown[]) => void);
    }
  };

  const off = <K extends keyof WebSocketEvents>(
    event: K,
    callback?: WebSocketEvents[K]
  ) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event as string, callback as (...args: unknown[]) => void);
      } else {
        socketRef.current.off(event as string);
      }
    }
  };

  const joinRoom = (newRoomKey: string) => {
    if (socketRef.current && roomKey !== newRoomKey) {
      // Leave current room
      socketRef.current.emit('leave-organization', roomKey);
      // Join new room
      socketRef.current.emit('join-organization', newRoomKey);
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && roomKey) {
      socketRef.current.emit('leave-organization', roomKey);
    }
  };

  const filterActivities = (kind?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('filter-activities', { roomKey, kind });
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    filterActivities,
  };
};
