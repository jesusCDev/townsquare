<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { habits, loading, loadHabits, completeHabit } from '$lib/stores/habits';
  import { socket } from '$lib/stores/socket';
  import { subDays, format, isSameDay } from 'date-fns';
  import { scrambleMode, scrambleText } from '$lib/stores/scramble';

  interface HabitEntry {
    id: string;
    habitId: string;
    date: string;
    count: number;
    completedAt: string;
  }

  let habitEntries: Record<string, HabitEntry[]> = {};
  let entriesLoaded = false;
  const daysToShow = 30;
  let draggedHabitId: string | null = null;
  let currentTime = new Date();
  let timeInterval: ReturnType<typeof setInterval>;

  let socketUnsubscribe: (() => void) | null = null;

  onMount(async () => {
    await loadHabits();

    // Wait a tick for the store to update
    await new Promise(resolve => setTimeout(resolve, 0));

    const currentHabits = $habits;

    if (currentHabits.length > 0) {
      const entryPromises = currentHabits.map(async habit => {
        const entries = await loadEntriesForHabit(habit.id);
        return { habitId: habit.id, entries };
      });
      const results = await Promise.all(entryPromises);

      // Build new object to trigger reactivity
      const newEntries: Record<string, HabitEntry[]> = {};
      results.forEach(({ habitId, entries }) => {
        newEntries[habitId] = entries;
      });
      habitEntries = newEntries;
    }

    // Always mark entries as loaded, even if no habits exist
    entriesLoaded = true;
    
    // Update current time every minute
    timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 60000);
    
    // Listen for entry updates from other clients (e.g., mobile)
    socketUnsubscribe = socket.subscribe(($socket) => {
      if ($socket) {
        console.log('🔔 Socket listener registered on main page (ID:', $socket.id + ')');
        
        // Remove any existing listener first
        $socket.off('habit:entry-updated');
        
        // Add the listener
        $socket.on('habit:entry-updated', async (data: { habitId: string; date: string }) => {
          console.log('🔔 Main page received update for habit:', data.habitId, 'date:', data.date);
          
          // Reload entries for the updated habit
          const entries = await loadEntriesForHabit(data.habitId);
          
          // Create a completely new object to trigger Svelte reactivity
          const newEntries = { ...habitEntries };
          newEntries[data.habitId] = entries;
          habitEntries = newEntries;
          
          console.log('🔔 Main page UI updated with', entries.length, 'entries');
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
      const response = await fetch(`/api/habits/${habitId}/entries?days=30`);
      if (response.ok) {
        const data = await response.json();
        return data.entries || data; // Handle both {entries: [...]} and [...] formats
      }
      return [];
    } catch (error) {
      console.error('[loadEntries] Error loading habit entries:', error);
      return [];
    }
  }

  async function handleHabitClick(habitId: string, date?: Date) {
    const targetDate = date || new Date();
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    // Optimistically update the UI first
    const habit = $habits.find(h => h.id === habitId);
    if (!habit) return;

    // Get existing entry or create new one
    const existingEntry = habitEntries[habitId]?.find(e => e.date === dateStr);
    const currentCount = existingEntry?.count || 0;

    // If already at max, reset to 0 (one more click cycles back)
    const newCount = currentCount >= habit.targetCount ? 0 : currentCount + 1;

    // Update local state immediately for instant feedback
    if (newCount === 0) {
      // Remove the entry from local state
      if (habitEntries[habitId]) {
        habitEntries[habitId] = habitEntries[habitId].filter(e => e.date !== dateStr);
      }
    } else if (existingEntry) {
      existingEntry.count = newCount;
    } else {
      if (!habitEntries[habitId]) habitEntries[habitId] = [];
      habitEntries[habitId].push({
        id: 'temp-' + Date.now(),
        habitId,
        date: dateStr,
        count: newCount,
        completedAt: new Date().toISOString()
      });
    }
    habitEntries = { ...habitEntries }; // Trigger reactivity immediately

    // Then sync with backend
    try {
      let response;
      if (newCount === 0) {
        // Delete the entry to reset
        response = await fetch(`/api/habits/${habitId}/entries/${dateStr}`, {
          method: 'DELETE',
        });
      } else {
        // Complete/increment the habit
        response = await fetch(`/api/habits/${habitId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });
      }

      if (response.ok) {
        // Reload from server to get accurate data
        const entries = await loadEntriesForHabit(habitId);
        habitEntries = { ...habitEntries, [habitId]: entries };
      } else {
        // Revert on error
        const entries = await loadEntriesForHabit(habitId);
        habitEntries = { ...habitEntries, [habitId]: entries };
      }
    } catch (error) {
      console.error('Failed to update habit:', error);
      // Revert on error
      const entries = await loadEntriesForHabit(habitId);
      habitEntries = { ...habitEntries, [habitId]: entries };
    }
  }

  function getIntensityClass(count: number, targetCount: number, isRestDay: boolean = false): string {
    if (isRestDay) return 'intensity-rest';
    if (count === 0) return 'intensity-0';
    if (count >= targetCount) return 'intensity-4'; // Max - fully complete
    
    // Calculate progress as a ratio
    const ratio = count / targetCount;
    
    // Scale to 4 intensity levels based on progress
    if (ratio >= 0.75) return 'intensity-3'; // 75-99%
    if (ratio >= 0.5) return 'intensity-2';  // 50-74%
    if (ratio >= 0.25) return 'intensity-1'; // 25-49%
    return 'intensity-1'; // 1-24%
  }

  function getEntryForDate(habitId: string, date: Date): HabitEntry | null {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entries = habitEntries[habitId] || [];
    return entries.find(e => e.date === dateStr) || null;
  }

  function isHabitOverdue(habit: any): boolean {
    if (!habit.timedWindows) return false;
    
    const windows = JSON.parse(habit.timedWindows);
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();
    const dayMask = 1 << dayOfWeek;
    const todayStr = format(now, 'yyyy-MM-dd');
    
    // Check if today's habit is already complete
    const entry = habitEntries[habit.id]?.find(e => e.date === todayStr);
    if (entry && entry.count >= habit.targetCount) return false;
    
    // Check if we're past any timed window for today
    for (const window of windows) {
      if ((window.days & dayMask) === 0) continue;
      
      const [endHours, endMinutes] = window.end.split(':').map(Number);
      const endTime = endHours * 60 + endMinutes;
      
      if (currentMinutes > endTime) {
        return true;
      }
    }
    
    return false;
  }

  async function handleDragStart(habitId: string) {
    draggedHabitId = habitId;
  }

  async function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(targetHabitId: string) {
    if (!draggedHabitId || draggedHabitId === targetHabitId) {
      draggedHabitId = null;
      return;
    }

    const draggedIdx = $habits.findIndex(h => h.id === draggedHabitId);
    const targetIdx = $habits.findIndex(h => h.id === targetHabitId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    // Reorder locally
    const reordered = [...$habits];
    const [removed] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, removed);
    
    // Update positions in backend
    try {
      await Promise.all(
        reordered.map((habit, index) =>
          fetch(`/api/habits/${habit.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: index }),
          })
        )
      );
      
      await loadHabits();
    } catch (error) {
      console.error('Failed to reorder habits:', error);
    }
    
    draggedHabitId = null;
  }

  // Helper to check if a day is a rest day during visual rendering
  // A rest day is the FIRST consecutive missing day after a completed day
  function isRestDay(habitId: string, date: Date): boolean {
    const entries = habitEntries[habitId] || [];
    const dateStr = format(date, 'yyyy-MM-dd');
    const prevDate = subDays(date, 1);
    const prevPrevDate = subDays(date, 2);
    
    const prevDateStr = format(prevDate, 'yyyy-MM-dd');
    const prevPrevDateStr = format(prevPrevDate, 'yyyy-MM-dd');
    
    // Check if current day has no entry
    const hasCurrentEntry = entries.some(e => e.date === dateStr && e.count > 0);
    if (hasCurrentEntry) return false;
    
    // Must be the FIRST missing day after a completed day
    // This means: previous day has entry OR previous day was also a rest day
    const hasPrevEntry = entries.some(e => e.date === prevDateStr && e.count > 0);
    const hasPrevPrevEntry = entries.some(e => e.date === prevPrevDateStr && e.count > 0);
    
    // If previous day has entry, this is first miss = rest day
    if (hasPrevEntry) return true;
    
    // If previous day was also missing but day before that had entry,
    // then previous day was the rest day, so this is a skip
    if (!hasPrevEntry && hasPrevPrevEntry) return false;
    
    // If both previous days were missing, this is definitely a skip
    return false;
  }

  function calculateStreak(habitId: string): number {
    const entries = habitEntries[habitId] || [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasTodayEntry = entries.some(e => e.date === todayStr && e.count > 0);
    
    let streak = 0;
    // If today is complete, include it in the streak and start from today
    // Otherwise, start from yesterday (today doesn't count yet)
    let currentDate = hasTodayEntry ? new Date() : subDays(new Date(), 1);
    let restDayAvailable = true; // Can use one rest day per streak
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const hasEntry = entries.some(e => e.date === dateStr && e.count > 0);
      
      if (hasEntry) {
        streak++;
        restDayAvailable = true; // Reset rest day availability when we find an entry
        currentDate = subDays(currentDate, 1);
      } else {
        // No entry - check if we can use this as a rest day
        if (restDayAvailable) {
          // This is the first consecutive missing day - count it as a rest day
          streak++;
          restDayAvailable = false; // Used our one rest day
          currentDate = subDays(currentDate, 1);
        } else {
          // Second consecutive missing day - this breaks the streak
          break;
        }
      }
    }
    
    return streak;
  }

  // Derive today from currentTime so it updates at midnight
  $: today = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());

  // days array now depends on currentTime, so it recalculates at midnight
  $: days = Array.from({ length: daysToShow }, (_, i) => subDays(today, daysToShow - 1 - i));

  // Force reactivity when habitEntries changes
  $: habitsWithEntries = $habits.map(h => ({ ...h, _entriesHash: JSON.stringify(habitEntries[h.id]) }));
</script>

<div class="habit-tracker glass">
  <div class="header">
    <h2>Habits</h2>
    <div class="legend font-mono">
      <span class="item"><span class="box intensity-0"></span>None</span>
      <span class="item"><span class="box intensity-2"></span>Med</span>
      <span class="item"><span class="box intensity-4"></span>Max</span>
      <span class="item"><span class="box intensity-rest"></span>Rest</span>
    </div>
  </div>

  {#if $loading || !entriesLoaded}
    <div class="loading">Loading habits...</div>
  {:else if $habits.length === 0}
    <div class="empty">No habits configured</div>
  {:else}
    <div class="habits-container">
      <div class="date-header font-mono">
        <div class="habit-name-col"></div>
        <div class="days-grid">
          {#each days as day, i}
            {@const isToday = isSameDay(day, today)}
            {#if isToday}
              <div class="date-label today-label">Today</div>
            {:else if i % 5 === 0}
              <div class="date-label">{format(day, 'M/d')}</div>
            {:else}
              <div class="date-spacer"></div>
            {/if}
          {/each}
        </div>
        <div class="stats-col"></div>
      </div>

      {#each habitsWithEntries as habit (habit.id)}
        {@const streak = calculateStreak(habit.id)}
        {@const overdue = isHabitOverdue(habit)}
        <div 
          class="habit-row"
          class:overdue={overdue}
        >
          <div class="habit-name-col">
            <span class="icon">{$scrambleMode ? '▪' : (habit.icon || '▪')}</span>
            <span class="name">{$scrambleMode ? scrambleText(habit.name) : habit.name}</span>
          </div>
          
          <div class="days-grid">
            {#each days as day}
              {@const entry = getEntryForDate(habit.id, day)}
              {@const count = entry?.count || 0}
              {@const isToday = isSameDay(day, today)}
              {@const isRest = count === 0 && isRestDay(habit.id, day)}
              <button
                class="day-cell {getIntensityClass(count, habit.targetCount, isRest)}"
                class:today={isToday}
                on:click={() => handleHabitClick(habit.id, day)}
                title="{format(day, 'MMM d')}: {isRest ? 'Rest day' : `${count}/${habit.targetCount}`} - Click to mark complete"
              ></button>
            {/each}
          </div>

          <div class="stats-col font-mono">
            <span class="streak">{#if streak > 0}{streak}d{/if}</span>
            <button class="complete-btn" on:click={() => handleHabitClick(habit.id)}>✓</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .habit-tracker {
    padding: 1.5rem 2rem;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .legend {
    display: flex;
    gap: 1.25rem;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .legend .item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .box {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .intensity-0 { background: var(--habit-none); }
  .intensity-1 { background: var(--habit-low); }
  .intensity-2 { background: var(--habit-medium); }
  .intensity-3 { background: var(--habit-high); }
  .intensity-4 { background: var(--habit-max); }
  .intensity-rest { background: var(--habit-rest); }

  .habits-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .habits-container::-webkit-scrollbar {
    width: 6px;
  }

  .habits-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .habits-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .habits-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .date-header {
    display: grid;
    grid-template-columns: 180px 1fr 100px;
    gap: 1.25rem;
    margin-bottom: 1rem;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    font-weight: 500;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(30, 1fr);
    gap: 3px;
  }

  .date-label {
    grid-column: span 1;
    text-align: center;
    font-size: 0.65rem;
  }

  .date-label.today-label {
    color: var(--accent-primary);
    font-weight: 600;
    margin-left: 8px;
  }

  .habit-row {
    display: grid;
    grid-template-columns: 180px 1fr 100px;
    gap: 1.25rem;
    align-items: center;
    padding: 0.85rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  /* Remove overdue styling - too confusing */
  .habit-row.overdue {
    /* No special styling */
  }

  .habit-row:last-child {
    border-bottom: none;
  }

  .habit-name-col {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon {
    font-size: 1.35rem;
    opacity: 0.9;
  }

  .name {
    font-weight: 500;
    font-size: 0.9rem;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .day-cell {
    aspect-ratio: 1;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    position: relative;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
    padding: 0;
  }

  .day-cell:hover {
    transform: scale(1.15);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .day-cell:active {
    transform: scale(1.05);
  }

  .day-cell.today {
    border: 2px solid var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(103, 254, 153, 0.2);
    margin-left: 8px;
    position: relative;
  }

  .day-cell.today::before {
    content: '';
    position: absolute;
    left: -6px;
    top: -4px;
    bottom: -4px;
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(103, 254, 153, 0.4), transparent);
  }

  .stats-col {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
  }

  .streak {
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 36px;
    text-align: right;
    color: var(--text-secondary);
  }

  .complete-btn {
    background: rgba(103, 254, 153, 0.15);
    color: var(--accent-primary);
    border: 1px solid rgba(103, 254, 153, 0.4);
    border-radius: 8px;
    padding: 0.5rem 0.9rem;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
  }

  .complete-btn:hover {
    background: rgba(103, 254, 153, 0.25);
  }

  .complete-btn:active {
    background: rgba(103, 254, 153, 0.35);
  }

  .loading, .empty {
    text-align: center;
    padding: 3rem;
    color: var(--text-tertiary);
    font-size: 0.9rem;
  }
</style>
