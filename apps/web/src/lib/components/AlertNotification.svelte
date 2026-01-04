<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { dismissAlertSignal } from '$lib/stores/alertActions';

  let alerts: any[] = [];
  let activeAlert: any | null = null;
  let interval: ReturnType<typeof setInterval>;
  let dismissed = false;
  let dismissedAlerts: Set<string> = new Set();

  // Listen for dismiss signal from keyboard shortcuts
  $: if ($dismissAlertSignal && activeAlert && !dismissed) {
    dismissAlert();
  }

  // Load dismissed alerts from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('dismissedAlerts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        dismissedAlerts = new Set(parsed);
      } catch (e) {
        console.error('Failed to parse dismissed alerts:', e);
      }
    }
  }

  onMount(async () => {
    await loadAlerts();
    
    // Check every minute if an alert should trigger
    interval = setInterval(() => {
      checkAlerts();
    }, 60000); // Check every minute
    
    // Also check immediately
    checkAlerts();
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  async function loadAlerts() {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      alerts = data.alerts || [];
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  function checkAlerts() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayMask = 1 << currentDay;
    const today = now.toISOString().split('T')[0];

    for (const alert of alerts) {
      // Check if alert applies to current day
      if ((alert.daysMask & dayMask) === 0) continue;

      // Parse alert time
      const [hours, minutes] = alert.time.split(':').map(Number);
      const alertMinutes = hours * 60 + minutes;

      // Check if we're within the grace period
      const minutesUntilAlert = alertMinutes - currentMinutes;
      
      if (minutesUntilAlert >= 0 && minutesUntilAlert <= alert.gracePeriod) {
        const alertKey = `${alert.id}-${today}`;
        
        // Skip if already dismissed today
        if (dismissedAlerts.has(alertKey)) continue;
        
        // Trigger alert if not already active
        if (!activeAlert || activeAlert.id !== alert.id) {
          activeAlert = { ...alert, minutesUntil: minutesUntilAlert, alertKey };
          dismissed = false;
        }
        return; // Only show one alert at a time
      }
    }

    // Clear active alert if grace period has passed
    if (activeAlert) {
      const [hours, minutes] = activeAlert.time.split(':').map(Number);
      const alertMinutes = hours * 60 + minutes;
      if (currentMinutes > alertMinutes) {
        activeAlert = null;
        dismissed = false;
      }
    }
  }

  function dismissAlert() {
    if (activeAlert && activeAlert.alertKey) {
      // Mark as dismissed for today
      dismissedAlerts.add(activeAlert.alertKey);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('dismissedAlerts', JSON.stringify([...dismissedAlerts]));
      }
    }
    
    dismissed = true;
    setTimeout(() => {
      activeAlert = null;
      dismissed = false;
    }, 300);
  }
</script>

{#if activeAlert && !dismissed}
  <div class="alert-overlay" class:dismissed>
    <div class="alert-card">
      <div class="alert-icon">⏰</div>
      <h2 class="alert-title">{activeAlert.name}</h2>
      <div class="alert-time">{activeAlert.time}</div>
      {#if activeAlert.minutesUntil > 0}
        <p class="alert-message">Starting in {activeAlert.minutesUntil} minute{activeAlert.minutesUntil !== 1 ? 's' : ''}</p>
      {:else}
        <p class="alert-message">Starting now!</p>
      {/if}
      <button class="dismiss-btn" on:click={dismissAlert}>
        Dismiss
      </button>
    </div>
  </div>
{/if}

<style>
  .alert-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: pulse 2s ease-in-out infinite;
  }

  .alert-overlay.dismissed {
    animation: fadeOut 0.3s ease-out forwards;
  }

  @keyframes pulse {
    0%, 100% {
      background: rgba(0, 0, 0, 0.85);
    }
    50% {
      background: rgba(0, 0, 0, 0.75);
    }
  }

  @keyframes fadeOut {
    to {
      opacity: 0;
    }
  }

  .alert-card {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(103, 254, 153, 0.2));
    border: 2px solid rgba(103, 254, 153, 0.5);
    border-radius: 24px;
    padding: 3rem 4rem;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6),
                0 0 40px rgba(103, 254, 153, 0.3),
                inset 0 0 40px rgba(255, 255, 255, 0.1);
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 600px;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .alert-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
    animation: bounce 1s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .alert-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--accent-primary);
    margin-bottom: 1rem;
    text-shadow: 0 0 20px rgba(103, 254, 153, 0.5);
  }

  .alert-time {
    font-size: 3rem;
    font-weight: 700;
    color: white;
    margin-bottom: 1.5rem;
    font-family: monospace;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  .alert-message {
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 2rem;
  }

  .dismiss-btn {
    background: rgba(59, 130, 246, 0.3);
    border: 2px solid rgba(59, 130, 246, 0.6);
    padding: 1rem 3rem;
    border-radius: 12px;
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dismiss-btn:hover {
    background: rgba(59, 130, 246, 0.5);
    border-color: rgba(59, 130, 246, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  }

  .dismiss-btn:active {
    transform: translateY(0);
  }
</style>
