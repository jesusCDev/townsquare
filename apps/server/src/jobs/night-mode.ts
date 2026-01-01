import { Server } from 'socket.io';
import { config } from '../config.js';

let isNightMode = false;

export function checkNightMode(io: Server) {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const startTime = config.nightModeStart;
  const endTime = config.nightModeEnd;

  // Check if current time is in night mode range
  const shouldBeNightMode = 
    (startTime < endTime && currentTime >= startTime && currentTime < endTime) ||
    (startTime > endTime && (currentTime >= startTime || currentTime < endTime));

  // Emit event if mode changed
  if (shouldBeNightMode !== isNightMode) {
    isNightMode = shouldBeNightMode;
    io.emit('nightmode:toggle', { 
      enabled: isNightMode,
      brightness: config.nightModeBrightness,
    });
  }
}
