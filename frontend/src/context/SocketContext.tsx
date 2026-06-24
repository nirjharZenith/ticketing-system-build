import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinOrg: (orgId: string) => void;
  leaveOrg: (orgId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinOrg: () => {},
  leaveOrg: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth(); // Assume we have AuthContext for the current user

  useEffect(() => {
    // Only connect if the user is authenticated
    if (!user) return;

    // Use environment variable or default to localhost:5000
    const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Prefer websocket
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const joinOrg = (orgId: string) => {
    if (socket && isConnected) {
      socket.emit('join_org', orgId);
    }
  };

  const leaveOrg = (orgId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_org', orgId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinOrg, leaveOrg }}>
      {children}
    </SocketContext.Provider>
  );
};
