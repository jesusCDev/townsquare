import { writable, derived, get } from 'svelte/store';
import { socket } from './socket';

interface NightModeState {
  serverEnabled: boolean;
  temporarilyDisabled: boolean;
  disableUntil: number | null;
}

const nightModeState = writable<NightModeState>({
  serverEnabled: false,
  temporarilyDisabled: false,
  disableUntil: null,
});

export const dimTimeout = writable(15); // Default 15 minutes
export const nightMode = derived(nightModeState, ($state) => 
  $state.serverEnabled && !$state.temporarilyDisabled
);

export const nightModeInfo = derived(nightModeState, ($state) => ({
  isActive: $state.serverEnabled && !$state.temporarilyDisabled,
  isScheduled: $state.serverEnabled,
  isTemporarilyDisabled: $state.temporarilyDisabled,
  disableUntil: $state.disableUntil,
}));

let disableTimer: ReturnType<typeof setTimeout> | null = null;

export function temporarilyDisableDim(minutes?: number) {
  const timeout = get(dimTimeout);
  const timeoutMinutes = minutes ?? timeout;
  const disableUntil = Date.now() + timeoutMinutes * 60 * 1000;
  
  nightModeState.update(state => ({
    ...state,
    temporarilyDisabled: true,
    disableUntil,
  }));
  
  if (disableTimer) clearTimeout(disableTimer);
  
  disableTimer = setTimeout(() => {
    nightModeState.update(state => ({
      ...state,
      temporarilyDisabled: false,
      disableUntil: null,
    }));
  }, timeoutMinutes * 60 * 1000);
}

export function manuallyEnableDim() {
  // Enable dim mode by setting serverEnabled to true
  nightModeState.update(state => ({
    ...state,
    serverEnabled: true,
    temporarilyDisabled: false,
    disableUntil: null,
  }));
  
  // Clear any existing timer
  if (disableTimer) {
    clearTimeout(disableTimer);
    disableTimer = null;
  }
}

// Listen for night mode updates from server
socket.subscribe(($socket) => {
  if ($socket) {
    $socket.on('nightmode:toggle', (data: { enabled: boolean }) => {
      nightModeState.update(state => ({
        ...state,
        serverEnabled: data.enabled,
      }));
    });
  }
});

// Auto-disable on any interaction
if (typeof window !== 'undefined') {
  // Load dim timeout from settings (client-side only)
  fetch('/api/settings/dimTimeout')
    .then(res => res.json())
    .then(data => {
      if (data.value) dimTimeout.set(data.value);
    })
    .catch(() => {});
  let interactionTimer: ReturnType<typeof setTimeout> | null = null;
  let hasInteracted = false;
  
  const handleInteraction = (event?: Event) => {
    // Ignore D key - it's handled by the keyboard shortcut
    if (event instanceof KeyboardEvent && (event.key === 'd' || event.key === 'D')) {
      return;
    }
    
    // Only check once per interaction burst
    if (hasInteracted) return;
    hasInteracted = true;
    
    // Debounce interactions to avoid multiple rapid calls
    if (interactionTimer) clearTimeout(interactionTimer);
    
    interactionTimer = setTimeout(() => {
      hasInteracted = false;
      const state = get(nightModeState);
      
      if (state.serverEnabled && !state.temporarilyDisabled) {
        temporarilyDisableDim();
      }
    }, 300);
  };
  
  window.addEventListener('click', handleInteraction);
  window.addEventListener('keydown', handleInteraction);
  window.addEventListener('touchstart', handleInteraction);
}
