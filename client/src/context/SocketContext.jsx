import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, connected: false });
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [state, setState] = useState({ socket: null, connected: false });

  useEffect(() => {
    if (!user) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setState({ socket, connected: true }));
    socket.on('disconnect', () => setState({ socket, connected: false }));
    setState({ socket, connected: socket.connected });
    return () => {
      socket.disconnect();
      setState({ socket: null, connected: false });
    };
  }, [token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={state}>{children}</SocketContext.Provider>;
}
