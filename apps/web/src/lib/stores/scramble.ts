import { writable, derived, get } from 'svelte/store';

// Initialize from localStorage if available
const getInitialScrambleMode = (): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('scrambleMode');
    return stored === 'true';
  }
  return false;
};

// Scramble mode state
export const scrambleMode = writable(typeof window !== 'undefined' ? getInitialScrambleMode() : false);

// Sync to localStorage and listen for changes from other tabs
if (typeof window !== 'undefined') {
  // Save to localStorage whenever state changes
  scrambleMode.subscribe(value => {
    localStorage.setItem('scrambleMode', String(value));
  });

  // Listen for changes from other tabs/pages
  window.addEventListener('storage', (event) => {
    if (event.key === 'scrambleMode') {
      const newValue = event.newValue === 'true';
      if (get(scrambleMode) !== newValue) {
        scrambleMode.set(newValue);
      }
    }
  });
}

// Characters to use for scrambling
const scrambleChars = '█▓▒░▀▄▌▐■□▪▫●○◆◇★☆';

// Generate random gibberish text of specified length
export function scrambleText(text: string): string {
  if (!text) return '';
  const length = text.length;
  let result = '';
  for (let i = 0; i < length; i++) {
    // Preserve spaces for readability
    if (text[i] === ' ') {
      result += ' ';
    } else {
      result += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    }
  }
  return result;
}

// Generate scrambled number (keeps format like percentages, times)
export function scrambleNumber(num: number, decimals: number = 0): string {
  const digits = Math.abs(num).toFixed(decimals).replace('.', '');
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  if (decimals > 0) {
    result = result.slice(0, -decimals) + '.' + result.slice(-decimals);
  }
  return num < 0 ? '-' + result : result;
}

// Toggle scramble mode
export function toggleScramble() {
  scrambleMode.update(v => !v);
}
