import { writable, derived } from 'svelte/store';

// Scramble mode state
export const scrambleMode = writable(false);

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
