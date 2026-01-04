import { writable } from 'svelte/store';

// Store to signal alert dismissal from keyboard shortcuts
export const dismissAlertSignal = writable(0);

export function triggerDismissAlert() {
  // Increment to trigger reactivity
  dismissAlertSignal.update(n => n + 1);
}
