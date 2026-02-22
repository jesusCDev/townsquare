import { get } from 'svelte/store';
import { nightMode } from './nightmode';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }

  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
}

function playTone(frequency: number, duration: number, volume = 0.15, type: OscillatorType = 'sine') {
  if (get(nightMode)) return; // Silent during dim mode

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Gentle two-tone ascending chime for schedule block transitions */
export function playScheduleTransition() {
  if (get(nightMode)) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = 0.12;

  // First note - C5
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523, ctx.currentTime);
  gain1.gain.setValueAtTime(vol, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);

  // Second note - E5 (slightly delayed)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
  gain2.gain.setValueAtTime(0.001, ctx.currentTime);
  gain2.gain.setValueAtTime(vol, ctx.currentTime + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.1);
  osc2.stop(ctx.currentTime + 0.3);
}

/** Short satisfying ding for habit completion */
export function playHabitComplete() {
  playTone(880, 0.2, 0.15, 'sine'); // A5
}

/** Soft low tone for habit reset/uncheck */
export function playHabitReset() {
  playTone(330, 0.12, 0.08, 'sine'); // E4
}
