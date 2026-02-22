<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { habits, loading, loadHabits } from '$lib/stores/habits';
  import { socket } from '$lib/stores/socket';
  import { nightModeInfo, temporarilyDisableDim, manuallyEnableDim } from '$lib/stores/nightmode';
  import { scrambleMode, scrambleText, toggleScramble } from '$lib/stores/scramble';
  import { format, isSameDay } from 'date-fns';

  interface HabitEntry {
    id: string;
    habitId: string;
    date: string;
    count: number;
    completedAt: string;
  }

  let habitEntries: Record<string, HabitEntry[]> = {};
  let entriesLoaded = false;
  let currentTime = new Date();
  let currentDateStr = format(new Date(), 'yyyy-MM-dd');
  let timeInterval: ReturnType<typeof setInterval>;
  let processingHabits = new Set<string>();
  let cooldownHabits = new Set<string>();
  let celebratingHabits = new Set<string>();
  let socketUnsubscribe: (() => void) | null = null;
  let toastMessage = '';
  let toastType: 'success' | 'error' = 'success';
  let showToast = false;

  function showNotification(message: string, type: 'success' | 'error' = 'success') {
    toastMessage = message;
    toastType = type;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, type === 'error' ? 3000 : 2000);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        showNotification(`Error entering fullscreen: ${err.message}`, 'error');
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ignore if user is typing in an input field
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Number keys 1-9 - Toggle habits
    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      const index = parseInt(event.key) - 1;
      const habitList = $habits;
      if (index >= 0 && index < habitList.length) {
        handleHabitClick(habitList[index].id);
      }
      return;
    }

    // D key - Toggle dim mode
    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      event.stopPropagation();
      console.log('[DIM] D key pressed, isActive:', $nightModeInfo.isActive);

      if ($nightModeInfo.isActive) {
        temporarilyDisableDim();
        showNotification('Dim mode disabled');
      } else {
        manuallyEnableDim();
        showNotification('Dim mode enabled');
      }
    }

    // S key - Toggle scramble mode
    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      const wasEnabled = $scrambleMode;
      toggleScramble();
      showNotification(wasEnabled ? 'Scramble mode disabled' : 'Scramble mode enabled');
    }
  }

  onMount(async () => {
    await loadHabits();
    await new Promise(resolve => setTimeout(resolve, 0));

    const currentHabits = $habits;
    if (currentHabits.length > 0) {
      const entryPromises = currentHabits.map(async habit => {
        const entries = await loadEntriesForHabit(habit.id);
        return { habitId: habit.id, entries };
      });
      const results = await Promise.all(entryPromises);

      const newEntries: Record<string, HabitEntry[]> = {};
      results.forEach(({ habitId, entries }) => {
        newEntries[habitId] = entries;
      });
      habitEntries = newEntries;
    }

    // Always mark entries as loaded, even if no habits exist
    entriesLoaded = true;

    // Update current time every minute and check for day changes
    timeInterval = setInterval(async () => {
      currentTime = new Date();
      const newDateStr = format(currentTime, 'yyyy-MM-dd');

      // If the day has changed, reload all entries
      if (newDateStr !== currentDateStr) {
        console.log('Day changed from', currentDateStr, 'to', newDateStr, '- reloading entries');
        currentDateStr = newDateStr;

        // Reload entries for all habits
        const currentHabits = $habits;
        if (currentHabits.length > 0) {
          const entryPromises = currentHabits.map(async habit => {
            const entries = await loadEntriesForHabit(habit.id);
            return { habitId: habit.id, entries };
          });
          const results = await Promise.all(entryPromises);

          const newEntries: Record<string, HabitEntry[]> = {};
          results.forEach(({ habitId, entries }) => {
            newEntries[habitId] = entries;
          });
          habitEntries = newEntries;
        }
      }
    }, 60000);

    // Add keyboard listener for dim mode toggle
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown, true);
    }

    // Listen for entry updates from other clients (e.g., dashboard)
    socketUnsubscribe = socket.subscribe(($socket) => {
      if ($socket) {
        // Remove any existing listener first
        $socket.off('habit:entry-updated');

        // Add the listener
        $socket.on('habit:entry-updated', async (data: { habitId: string; date: string }) => {
          // Reload entries for the updated habit
          const entries = await loadEntriesForHabit(data.habitId);
          // Create a completely new object to trigger Svelte reactivity
          const newEntries = { ...habitEntries };
          newEntries[data.habitId] = entries;
          habitEntries = newEntries;
        });
      }
    });
  });

  onDestroy(() => {
    if (timeInterval) clearInterval(timeInterval);
    if (socketUnsubscribe) socketUnsubscribe();
    if ($socket) {
      $socket.off('habit:entry-updated');
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown, true);
    }
  });

  async function loadEntriesForHabit(habitId: string): Promise<HabitEntry[]> {
    try {
      const response = await fetch(`/api/habits/${habitId}/entries?days=7`);
      if (response.ok) {
        const data = await response.json();
        return data.entries || data;
      }
      return [];
    } catch (error) {
      console.error('Error loading habit entries:', error);
      return [];
    }
  }

  async function handleHabitClick(habitId: string) {
    // Prevent double-clicks, clicks during processing, and clicks during cooldown
    if (processingHabits.has(habitId) || cooldownHabits.has(habitId)) return;

    processingHabits.add(habitId);
    processingHabits = processingHabits; // trigger reactivity

    const targetDate = new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const habit = $habits.find(h => h.id === habitId);
    if (!habit) {
      processingHabits.delete(habitId);
      processingHabits = processingHabits;
      return;
    }

    const existingEntry = habitEntries[habitId]?.find(e => e.date === dateStr);
    const currentCount = existingEntry?.count || 0;
    const isResetting = currentCount >= habit.targetCount;
    const newCount = isResetting ? 0 : currentCount + 1;
    const willBeComplete = newCount >= habit.targetCount;

    // Optimistic update - create new arrays/objects for Svelte reactivity
    const currentEntries = habitEntries[habitId] || [];
    let newEntries: HabitEntry[];

    if (isResetting) {
      // Reset to 0 - filter out the entry
      newEntries = currentEntries.filter(e => e.date !== dateStr);
    } else if (existingEntry) {
      // Increment count - create new entry object
      newEntries = currentEntries.map(e =>
        e.date === dateStr ? { ...e, count: currentCount + 1 } : e
      );
    } else {
      // Add new entry
      newEntries = [...currentEntries, {
        id: 'temp-' + Date.now(),
        habitId,
        date: dateStr,
        count: 1,
        completedAt: new Date().toISOString()
      }];
    }

    // Create entirely new object to trigger reactivity
    habitEntries = { ...habitEntries, [habitId]: newEntries };

    // Trigger celebration animation if habit is now complete
    if (willBeComplete && !isResetting) {
      celebratingHabits.add(habitId);
      celebratingHabits = celebratingHabits;
      setTimeout(() => {
        celebratingHabits.delete(habitId);
        celebratingHabits = celebratingHabits;
      }, 600);
    }

    // Sync with backend
    try {
      if (isResetting) {
        // Reset: delete the entry
        console.log('📤 Mobile: Deleting habit', habitId, 'for', dateStr);
        const response = await fetch(`/api/habits/${habitId}/entries/${dateStr}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          // Revert on error
          const entries = await loadEntriesForHabit(habitId);
          habitEntries = { ...habitEntries, [habitId]: entries };
          showNotification('Failed to reset habit. Please try again.', 'error');
        } else {
          console.log('📤 Mobile: Delete successful, server emitting socket event');
        }
      } else {
        // Increment: add timestamp
        console.log('📤 Mobile: Completing habit', habitId, 'for', dateStr);
        const response = await fetch(`/api/habits/${habitId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });

        if (!response.ok) {
          // Revert on error
          const entries = await loadEntriesForHabit(habitId);
          habitEntries = { ...habitEntries, [habitId]: entries };
          showNotification('Failed to save. Please try again.', 'error');
        } else {
          console.log('📤 Mobile: Completion successful, server emitting socket event');
        }
      }
    } catch (error) {
      console.error('Failed to update habit:', error);
      // Revert on error
      const entries = await loadEntriesForHabit(habitId);
      habitEntries = { ...habitEntries, [habitId]: entries };
      showNotification('Connection error. Please try again.', 'error');
    } finally {
      processingHabits.delete(habitId);
      processingHabits = processingHabits;

      // Add brief cooldown to prevent accidental double-taps (300ms)
      cooldownHabits.add(habitId);
      cooldownHabits = cooldownHabits;
      setTimeout(() => {
        cooldownHabits.delete(habitId);
        cooldownHabits = cooldownHabits;
      }, 300);
    }
  }

  function getTodayEntry(habitId: string): HabitEntry | null {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const entries = habitEntries[habitId] || [];
    return entries.find(e => e.date === dateStr) || null;
  }

  function calculateStreak(habitId: string): number {
    const entries = habitEntries[habitId] || [];
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const habit = $habits.find(h => h.id === habitId);
      if (!habit) break;
      
      const entry = entries.find(e => e.date === dateStr);
      if (!entry || entry.count < habit.targetCount) break;
      
      streak++;
      currentDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
      if (streak > 365) break; // Safety limit
    }
    
    return streak;
  }

  function getProgressPercentage(habitId: string): number {
    const habit = $habits.find(h => h.id === habitId);
    if (!habit) return 0;
    
    const entry = getTodayEntry(habitId);
    const count = entry?.count || 0;
    return Math.min((count / habit.targetCount) * 100, 100);
  }

  function isComplete(habitId: string): boolean {
    const habit = $habits.find(h => h.id === habitId);
    if (!habit) return false;

    const entry = getTodayEntry(habitId);
    const count = entry?.count || 0;
    return count >= habit.targetCount;
  }
</script>

<svelte:head>
  <title>LifeBoard Mobile</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
</svelte:head>

<div class="mobile-container">
  <!-- Header with Stats -->
  <div class="mobile-header">
    <div class="date-stats">
      <div class="date font-mono">{format(currentTime, 'EEEE, MMMM d')}</div>
      <div class="header-right">
        <div class="completed-stats font-mono">
          <span class="completed-count">{$habits.filter(h => { const e = (habitEntries[h.id] || []).find(e => e.date === format(new Date(), 'yyyy-MM-dd')); return (e?.count || 0) >= h.targetCount; }).length}/{$habits.length}</span>
        </div>
        <button
          class="header-icon-btn"
          class:active={$nightModeInfo.isActive}
          on:click|stopPropagation={() => {
            console.log('[DIM] button clicked, isActive:', $nightModeInfo.isActive);
            if ($nightModeInfo.isActive) {
              temporarilyDisableDim();
              showNotification('Dim mode disabled');
            } else {
              manuallyEnableDim();
              showNotification('Dim mode enabled');
            }
          }}
          aria-label="Toggle dim mode"
        >🌙</button>
        <button
          class="header-icon-btn"
          on:click={toggleFullscreen}
          aria-label="Toggle fullscreen"
        >⛶</button>
      </div>
    </div>
  </div>

  <!-- Habits List -->
  <div class="habits-list">
    {#if $loading || !entriesLoaded}
      <div class="loading">Loading habits...</div>
    {:else if $habits.length === 0}
      <div class="empty">No habits configured</div>
    {:else}
      {#each $habits as habit (habit.id)}
        {@const todayStr = format(new Date(), 'yyyy-MM-dd')}
        {@const entries = habitEntries[habit.id] || []}
        {@const entry = entries.find(e => e.date === todayStr) || null}
        {@const count = entry?.count || 0}
        {@const complete = count >= habit.targetCount}
        {@const progress = Math.min((count / habit.targetCount) * 100, 100)}
        {@const streak = calculateStreak(habit.id)}
        
        <button
          class="habit-card glass"
          class:complete={complete}
          class:processing={processingHabits.has(habit.id)}
          class:celebrating={celebratingHabits.has(habit.id)}
          disabled={processingHabits.has(habit.id) || cooldownHabits.has(habit.id)}
          on:click={() => handleHabitClick(habit.id)}
        >
          <div class="habit-header">
            <div class="habit-icon">{$scrambleMode ? '▪' : (habit.icon || '▪')}</div>
            <div class="habit-info">
              <div class="habit-name">{$scrambleMode ? scrambleText(habit.name) : habit.name}</div>
              <div class="habit-meta font-mono">
                <span class="progress-text">{count}/{habit.targetCount}</span>
                {#if streak > 0}
                  <span class="streak-text">🔥 {streak}d</span>
                {/if}
              </div>
            </div>
            <div class="check-icon" class:visible={complete}>✓</div>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progress}%"></div>
          </div>
        </button>
      {/each}
    {/if}
  </div>

  <!-- Toast Notification -->
  {#if showToast}
    <div class="toast" class:show={showToast} class:error={toastType === 'error'}>
      {toastMessage}
    </div>
  {/if}
</div>

<style>
  .mobile-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    max-width: 100vw;
    overflow-x: hidden;
    background: var(--bg-primary);
    padding: 1rem;
    gap: 1rem;
  }

  .mobile-header {
    position: relative;
    z-index: 10000;
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(18, 18, 18, 0.95);
    border-radius: 16px;
    margin-bottom: 0.5rem;
  }

  .date-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .date {
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .completed-stats {
    display: flex;
    align-items: baseline;
  }

  .completed-count {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-primary);
  }

  .header-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .header-icon-btn:active {
    transform: scale(0.92);
  }

  .header-icon-btn.active {
    background: rgba(103, 254, 153, 0.15);
    border-color: rgba(103, 254, 153, 0.4);
  }

  .habits-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    padding-bottom: 1rem;
  }

  .habits-list::-webkit-scrollbar {
    display: none;
  }

  .habit-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    border-radius: 16px;
    background: rgba(26, 26, 26, 0.95);
    border: 1px solid var(--glass-border);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  .habit-card:active {
    transform: scale(0.98);
    background: var(--surface-hover);
  }

  .habit-card.complete {
    background: rgba(103, 254, 153, 0.1);
    border-color: rgba(103, 254, 153, 0.3);
  }

  .habit-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .habit-icon {
    font-size: 2rem;
    line-height: 1;
    opacity: 0.9;
  }

  .habit-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .habit-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .habit-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .progress-text {
    font-weight: 600;
  }

  .streak-text {
    color: var(--accent-warning);
  }

  .check-icon {
    font-size: 1.5rem;
    color: var(--accent-primary);
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s ease;
  }

  .check-icon.visible {
    opacity: 1;
    transform: scale(1);
  }

  .progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-primary);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .habit-card.complete .progress-fill {
    background: var(--accent-primary);
  }


  .loading, .empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-tertiary);
    font-size: 0.9rem;
  }

  /* Responsive adjustments */
  @media (min-width: 600px) {
    .mobile-container {
      padding: 1.5rem 2rem;
    }
    
    .habit-card {
      padding: 1.5rem;
    }
  }

  /* Handle safe areas for notched devices */
  @supports (padding-top: env(safe-area-inset-top)) {
    .mobile-container {
      padding-top: max(1rem, env(safe-area-inset-top));
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
      padding-left: max(1rem, env(safe-area-inset-left));
      padding-right: max(1rem, env(safe-area-inset-right));
    }
  }


  /* Toast notification */
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: rgba(0, 0, 0, 0.9);
    color: var(--accent-primary);
    padding: 1rem 1.5rem;
    border-radius: 12px;
    border: 2px solid var(--accent-primary);
    font-weight: 600;
    font-size: 0.95rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6),
                0 0 20px rgba(103, 254, 153, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Error toast styling */
  .toast.error {
    color: #ff6b6b;
    border-color: #ff6b6b;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6),
                0 0 20px rgba(255, 107, 107, 0.3);
  }

  /* Celebration animation when habit is completed */
  .habit-card.celebrating {
    animation: celebrate 0.6s ease-out;
  }

  .habit-card.celebrating .check-icon {
    animation: checkPop 0.4s ease-out;
  }

  @keyframes celebrate {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(103, 254, 153, 0.4);
    }
    25% {
      transform: scale(1.02);
      box-shadow: 0 0 0 8px rgba(103, 254, 153, 0.2);
    }
    50% {
      transform: scale(0.98);
      box-shadow: 0 0 0 12px rgba(103, 254, 153, 0.1);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(103, 254, 153, 0);
    }
  }

  @keyframes checkPop {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
