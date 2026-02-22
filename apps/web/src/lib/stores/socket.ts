import { writable, get } from 'svelte/store';
import { io, Socket } from 'socket.io-client';

export const socket = writable<Socket | null>(null);
export const isConnected = writable(false);

let currentSocket: Socket | null = null;

export function connectSocket() {
  // Prevent duplicate connections (e.g. from HMR re-mounts)
  if (currentSocket?.connected) {
    return currentSocket;
  }

  // Clean up stale socket if it exists
  if (currentSocket) {
    currentSocket.disconnect();
  }

  const socketInstance = io({
    transports: ['websocket', 'polling'],
  });

  socketInstance.on('connect', () => {
    console.log('Socket connected');
    isConnected.set(true);
  });

  socketInstance.on('disconnect', () => {
    console.log('Socket disconnected');
    isConnected.set(false);
  });

  currentSocket = socketInstance;
  socket.set(socketInstance);

  return socketInstance;
}
