import { writable } from 'svelte/store';
import { io, Socket } from 'socket.io-client';

export const socket = writable<Socket | null>(null);
export const isConnected = writable(false);

export function connectSocket() {
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

  socket.set(socketInstance);

  return socketInstance;
}
