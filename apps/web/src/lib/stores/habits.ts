import { writable } from 'svelte/store';
import { socket } from './socket';

export interface Habit {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  targetCount: number;
  timedWindows?: string;
  position: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const habits = writable<Habit[]>([]);
export const loading = writable(true);

export async function loadHabits() {
  try {
    const response = await fetch('/api/habits');
    const data = await response.json();
    habits.set(data.habits || []);
  } catch (error) {
    console.error('Failed to load habits:', error);
  } finally {
    loading.set(false);
  }
}

export async function completeHabit(habitId: string) {
  try {
    await fetch(`/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch (error) {
    console.error('Failed to complete habit:', error);
  }
}

// Listen for habit updates from server
socket.subscribe(($socket) => {
  if ($socket) {
    $socket.on('habit:created', (habit: Habit) => {
      habits.update(h => [...h, habit]);
    });

    $socket.on('habit:updated', () => {
      // Only reload habits when metadata changes (name, icon, etc.)
      loadHabits();
    });

    $socket.on('habit:entry-updated', (data: { habitId: string; date: string }) => {
      // Entry updates (completions) don't need to reload habits
      // Components should handle entry reloading themselves if needed
    });

    $socket.on('habit:deleted', (data: { habitId: string }) => {
      habits.update(h => h.filter(habit => habit.id !== data.habitId));
    });
  }
});
