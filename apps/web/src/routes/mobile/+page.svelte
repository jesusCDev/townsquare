<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { habits, loading, loadHabits } from '$lib/stores/habits';
  import { socket } from '$lib/stores/socket';
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
  let timeInterval: ReturnType<typeof setInterval>;
  let processingHabits = new Set<string>();
  let socketUnsubscribe: (() => void) | null = null;

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
      entriesLoaded = true;
    }
    
    // Update current time every minute
    timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 60000);
    
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
    // Prevent double-clicks and clicks during processing
    if (processingHabits.has(habitId)) return;
    
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
    
    // Optimistic update
    if (isResetting) {
      // Reset to 0
      habitEntries[habitId] = habitEntries[habitId]?.filter(e => e.date !== dateStr) || [];
    } else {
      // Increment count
      if (existingEntry) {
        existingEntry.count = currentCount + 1;
      } else {
        if (!habitEntries[habitId]) habitEntries[habitId] = [];
        habitEntries[habitId].push({
          id: 'temp-' + Date.now(),
          habitId,
          date: dateStr,
          count: 1,
          completedAt: new Date().toISOString()
        });
      }
    }
    habitEntries = { ...habitEntries };
    
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
        } else {
          console.log('📤 Mobile: Completion successful, server emitting socket event');
        }
      }
    } catch (error) {
      console.error('Failed to update habit:', error);
      // Revert on error
      const entries = await loadEntriesForHabit(habitId);
      habitEntries = { ...habitEntries, [habitId]: entries };
    } finally {
      processingHabits.delete(habitId);
      processingHabits = processingHabits;
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

  // Reactive sorted habits - depends on both habits and habitEntries
  $: sortedHabits = (() => {
    // Reference habitEntries to trigger reactivity
    const _ = habitEntries;
    return [...$habits].sort((a, b) => {
      const aComplete = isComplete(a.id);
      const bComplete = isComplete(b.id);
      const aProgress = getProgressPercentage(a.id);
      const bProgress = getProgressPercentage(b.id);
      
      // Full complete goes to bottom
      if (aComplete && !bComplete) return 1;
      if (!aComplete && bComplete) return -1;
      
      // Both incomplete or both complete: sort by progress (higher first)
      return bProgress - aProgress;
    });
  })();
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
      <div class="completed-stats font-mono">
        <span class="completed-count">{$habits.filter(h => isComplete(h.id)).length}/{$habits.length}</span>
        <span class="completed-label">completed</span>
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
      {#each sortedHabits as habit (habit.id)}
        {@const entry = getTodayEntry(habit.id)}
        {@const count = entry?.count || 0}
        {@const streak = calculateStreak(habit.id)}
        {@const progress = getProgressPercentage(habit.id)}
        {@const complete = isComplete(habit.id)}
        
        <button
          class="habit-card glass"
          class:complete={complete}
          class:processing={processingHabits.has(habit.id)}
          disabled={processingHabits.has(habit.id)}
          on:click={() => handleHabitClick(habit.id)}
        >
          <div class="habit-header">
            <div class="habit-icon">{habit.icon || '▪'}</div>
            <div class="habit-info">
              <div class="habit-name">{habit.name}</div>
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

  .completed-stats {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .completed-count {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-primary);
  }

  .completed-label {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
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

  .habit-card.processing {
    opacity: 0.6;
    pointer-events: none;
  }

  .habit-card:disabled {
    cursor: not-allowed;
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
</style>
