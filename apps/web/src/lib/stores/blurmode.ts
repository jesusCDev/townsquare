import { writable, derived, get } from 'svelte/store';

interface BlurModeState {
  enabled: boolean;
  disableAt: number | null;
}

const blurModeState = writable<BlurModeState>({
  enabled: false,
  disableAt: null,
});

export const blurMode = derived(blurModeState, ($state) => $state.enabled);

export const blurModeInfo = derived(blurModeState, ($state) => ({
  enabled: $state.enabled,
  disableAt: $state.disableAt,
  minutesRemaining: $state.disableAt 
    ? Math.ceil(($state.disableAt - Date.now()) / 1000 / 60)
    : 0,
}));

export const blurTimeout = writable(15); // Default 15 minutes
let disableTimer: ReturnType<typeof setTimeout> | null = null;

export function toggleBlurMode() {
  const state = get(blurModeState);
  
  if (state.enabled) {
    // Disable blur
    disableBlurMode();
  } else {
    // Enable blur
    enableBlurMode();
  }
}

export function enableBlurMode() {
  const timeout = get(blurTimeout);
  const disableAt = Date.now() + timeout * 60 * 1000;
  
  blurModeState.set({
    enabled: true,
    disableAt,
  });
  
  // Clear any existing timer
  if (disableTimer) clearTimeout(disableTimer);
  
  // Set timer to auto-disable
  disableTimer = setTimeout(() => {
    disableBlurMode();
  }, timeout * 60 * 1000);
}

export function disableBlurMode() {
  blurModeState.set({
    enabled: false,
    disableAt: null,
  });
  
  if (disableTimer) {
    clearTimeout(disableTimer);
    disableTimer = null;
  }
}

// Load blur timeout from settings (client-side only)
if (typeof window !== 'undefined') {
  fetch('/api/settings/blurTimeout')
    .then(res => res.json())
    .then(data => {
      if (data.value) blurTimeout.set(data.value);
    })
    .catch(() => {});
}
