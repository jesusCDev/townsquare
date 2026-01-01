import { writable } from 'svelte/store';

export type TimeFormat = '12' | '24';

// Load from localStorage or default to 24-hour
const stored = typeof window !== 'undefined' 
  ? (localStorage.getItem('timeFormat') as TimeFormat) 
  : null;

export const timeFormat = writable<TimeFormat>(stored || '24');

// Persist to localStorage when changed
if (typeof window !== 'undefined') {
  timeFormat.subscribe(value => {
    localStorage.setItem('timeFormat', value);
  });
}

// Helper function to format time based on preference
export function formatTime(date: Date, format: TimeFormat): string {
  if (format === '12') {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
}
