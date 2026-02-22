import { writable, derived, get } from 'svelte/store';
import { socket } from './socket';

interface NightModeState {
  serverEnabled: boolean;
  manuallyEnabled: boolean;
  temporarilyDisabled: boolean;
  disableUntil: number | null;
}

// Initialize from localStorage if available
const getInitialState = (): NightModeState => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nightModeState');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if disableUntil has expired
        if (parsed.disableUntil && Date.now() > parsed.disableUntil) {
          return {
            serverEnabled: parsed.serverEnabled || false,
            manuallyEnabled: parsed.manuallyEnabled || false,
            temporarilyDisabled: false,
            disableUntil: null,
          };
        }
        return {
          serverEnabled: parsed.serverEnabled || false,
          manuallyEnabled: parsed.manuallyEnabled || false,
          temporarilyDisabled: parsed.temporarilyDisabled || false,
          disableUntil: parsed.disableUntil || null,
        };
      } catch {
        // Ignore parse errors
      }
    }
  }
  return {
    serverEnabled: false,
    manuallyEnabled: false,
    temporarilyDisabled: false,
    disableUntil: null,
  };
};

const nightModeState = writable<NightModeState>(
  typeof window !== 'undefined' ? getInitialState() : {
    serverEnabled: false,
    manuallyEnabled: false,
    temporarilyDisabled: false,
    disableUntil: null,
  }
);

export const dimTimeout = writable(15); // Default 15 minutes
export const nightMode = derived(nightModeState, ($state) =>
  ($state.serverEnabled || $state.manuallyEnabled) && !$state.temporarilyDisabled
);

// Sync to localStorage and listen for changes from other tabs
if (typeof window !== 'undefined') {
  // Save to localStorage whenever state changes
  nightModeState.subscribe(state => {
    localStorage.setItem('nightModeState', JSON.stringify(state));
  });

  // Listen for changes from other tabs/pages
  window.addEventListener('storage', (event) => {
    if (event.key === 'nightModeState' && event.newValue) {
      try {
        const newState = JSON.parse(event.newValue);
        const currentState = get(nightModeState);
        // Only update if different to avoid loops
        if (JSON.stringify(currentState) !== event.newValue) {
          nightModeState.set(newState);
        }
      } catch {
        // Ignore parse errors
      }
    }
  });
}

export const nightModeInfo = derived(nightModeState, ($state) => ({
  isActive: ($state.serverEnabled || $state.manuallyEnabled) && !$state.temporarilyDisabled,
  isScheduled: $state.serverEnabled,
  isManuallyEnabled: $state.manuallyEnabled,
  isTemporarilyDisabled: $state.temporarilyDisabled,
  disableUntil: $state.disableUntil,
}));

let disableTimer: ReturnType<typeof setTimeout> | null = null;

export function temporarilyDisableDim(minutes?: number) {
  const currentState = get(nightModeState);

  // If only manually enabled (not in scheduled night mode hours), just disable without timeout
  if (!currentState.serverEnabled && currentState.manuallyEnabled) {
    nightModeState.update(state => ({
      ...state,
      manuallyEnabled: false,
      temporarilyDisabled: false,
      disableUntil: null,
    }));

    if (disableTimer) {
      clearTimeout(disableTimer);
      disableTimer = null;
    }

    // Broadcast to other clients
    const $socket = get(socket);
    $socket?.emit('nightmode:manual', { enabled: false });
    return;
  }

  // In scheduled night mode - use timeout behavior
  const timeout = get(dimTimeout);
  const timeoutMinutes = minutes ?? timeout;
  const disableUntil = Date.now() + timeoutMinutes * 60 * 1000;

  nightModeState.update(state => ({
    ...state,
    temporarilyDisabled: true,
    disableUntil,
  }));

  // Broadcast to other clients
  const $socket = get(socket);
  $socket?.emit('nightmode:manual', { enabled: false });

  if (disableTimer) clearTimeout(disableTimer);

  disableTimer = setTimeout(() => {
    // Only re-enable if serverEnabled is still true (meaning we're still in scheduled night hours)
    const state = get(nightModeState);
    if (state.serverEnabled) {
      nightModeState.update(s => ({
        ...s,
        temporarilyDisabled: false,
        disableUntil: null,
      }));
    } else {
      // Night mode ended, just clear the temporary state
      nightModeState.update(s => ({
        ...s,
        temporarilyDisabled: false,
        disableUntil: null,
      }));
    }
  }, timeoutMinutes * 60 * 1000);
}

export function manuallyEnableDim() {
  const currentState = get(nightModeState);

  // If in scheduled night mode hours, just clear the temporary disable
  if (currentState.serverEnabled) {
    nightModeState.update(state => ({
      ...state,
      temporarilyDisabled: false,
      disableUntil: null,
    }));

    if (disableTimer) {
      clearTimeout(disableTimer);
      disableTimer = null;
    }

    // Broadcast to other clients
    const $socket = get(socket);
    $socket?.emit('nightmode:manual', { enabled: true });
    return;
  }

  // Not in scheduled hours - manually enable with 10-minute timeout
  const MANUAL_TIMEOUT_MINUTES = 10;
  const disableUntil = Date.now() + MANUAL_TIMEOUT_MINUTES * 60 * 1000;

  nightModeState.update(state => ({
    ...state,
    manuallyEnabled: true,
    temporarilyDisabled: false,
    disableUntil,
  }));

  // Broadcast to other clients
  const $socket = get(socket);
  $socket?.emit('nightmode:manual', { enabled: true });

  // Clear any existing timer
  if (disableTimer) {
    clearTimeout(disableTimer);
  }

  // Set up auto-disable after 10 minutes
  disableTimer = setTimeout(() => {
    const state = get(nightModeState);
    // Only disable if still manually enabled (not entered scheduled night mode)
    if (state.manuallyEnabled && !state.serverEnabled) {
      nightModeState.update(s => ({
        ...s,
        manuallyEnabled: false,
        disableUntil: null,
      }));
    }
  }, MANUAL_TIMEOUT_MINUTES * 60 * 1000);
}

// Listen for night mode updates from server and other clients
socket.subscribe(($socket) => {
  if ($socket) {
    $socket.off('nightmode:toggle');
    $socket.off('nightmode:manual');

    $socket.on('nightmode:toggle', (data: { enabled: boolean }) => {
      nightModeState.update(state => ({
        ...state,
        serverEnabled: data.enabled,
      }));
    });

    // Listen for manual dim toggles from other clients
    $socket.on('nightmode:manual', (data: { enabled: boolean }) => {
      if (data.enabled) {
        nightModeState.update(state => ({
          ...state,
          manuallyEnabled: true,
          temporarilyDisabled: false,
        }));
      } else {
        nightModeState.update(state => ({
          ...state,
          manuallyEnabled: false,
          temporarilyDisabled: false,
          disableUntil: null,
        }));
      }
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
    // Ignore D and S keys - they're handled by keyboard shortcuts
    if (event instanceof KeyboardEvent &&
        (event.key === 'd' || event.key === 'D' || event.key === 's' || event.key === 'S')) {
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

      // Only auto-disable on interaction during SCHEDULED night mode (not manual)
      // Manual dim should only be controlled by explicit user action
      if (state.serverEnabled && !state.temporarilyDisabled) {
        temporarilyDisableDim();
      }
    }, 300);
  };
  
  window.addEventListener('click', handleInteraction);
  window.addEventListener('keydown', handleInteraction);
  window.addEventListener('touchstart', handleInteraction);
}
