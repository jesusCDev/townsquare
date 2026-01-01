import { writable } from 'svelte/store';
import { socket } from './socket';

export interface ScheduleBlock {
  id: string;
  name: string;
  color: string;
  icon?: string;
  startTime: string;
  endTime?: string;
  daysMask: number;
  position: number;
  isActive: boolean;
  createdAt: string;
}

export const scheduleBlocks = writable<ScheduleBlock[]>([]);
export const currentBlock = writable<ScheduleBlock | null>(null);
export const nextBlock = writable<ScheduleBlock | null>(null);

export async function loadSchedule() {
  try {
    const response = await fetch('/api/schedule');
    const data = await response.json();
    scheduleBlocks.set(data.blocks || []);
  } catch (error) {
    console.error('Failed to load schedule:', error);
  }
}

export async function loadCurrentSchedule() {
  try {
    const response = await fetch('/api/schedule/current');
    const data = await response.json();
    currentBlock.set(data.current);
    nextBlock.set(data.next);
  } catch (error) {
    console.error('Failed to load current schedule:', error);
  }
}

// Listen for schedule updates from server
socket.subscribe(($socket) => {
  if ($socket) {
    $socket.on('schedule:updated', () => {
      loadSchedule();
      loadCurrentSchedule();
    });
  }
});
