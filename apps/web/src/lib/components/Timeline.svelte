<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { scheduleBlocks, loadSchedule } from '$lib/stores/schedule';
  import { format } from 'date-fns';
  import { timeFormat, formatTime } from '$lib/stores/timeFormat';

  let currentTime = new Date();
  let interval: ReturnType<typeof setInterval>;

  let previousBlockId: string | null = null;

  onMount(async () => {
    console.log('[Timeline] Component mounted, loading schedule...');
    await loadSchedule();
    console.log('[Timeline] Schedule loaded, blocks:', $scheduleBlocks.length);
    
    // Update every second to ensure progress updates in real-time
    interval = setInterval(() => {
      // Create a new Date object to trigger reactivity
      currentTime = new Date();
      
      // Check if we've moved to a new block
      const blocks = getCurrentDayBlocks();
      const current = getCurrentBlock(blocks);
      const currentId = current?.id || null;
      
      if (currentId !== previousBlockId) {
        console.log('[Timeline] Block changed from', previousBlockId, 'to', currentId);
        previousBlockId = currentId;
      }
    }, 1000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function getCurrentDayBlocks() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayMask = 1 << dayOfWeek;

    console.log('[getCurrentDayBlocks] Day of week:', dayOfWeek, 'dayMask:', dayMask);
    console.log('[getCurrentDayBlocks] All blocks:', $scheduleBlocks.length);
    $scheduleBlocks.forEach(block => {
      console.log(`  Block: ${block.name}, daysMask: ${block.daysMask}, matches: ${(block.daysMask & dayMask) !== 0}`);
    });

    return $scheduleBlocks
      .filter(block => (block.daysMask & dayMask) !== 0)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  function getBlockWidth(block: any): number {
    const start = timeToMinutes(block.startTime);
    const end = block.endTime ? timeToMinutes(block.endTime) : 1440;
    const duration = end - start;
    return (duration / 1440) * 100;
  }

  function getAdjustedBlockWidth(block: any, isActive: boolean, totalBlocks: number): number {
    if (totalBlocks <= 1) return 100;
    
    if (isActive) {
      return 70; // Active block takes 70%
    }
    
    // Remaining blocks share the 30%
    const inactiveBlockCount = totalBlocks - 1;
    return inactiveBlockCount > 0 ? 30 / inactiveBlockCount : 30;
  }

  function getCurrentTimePosition(): number {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return (minutes / 1440) * 100;
  }

  function getCurrentBlock(blocks: any[]) {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Find the block where current time is within the range
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const start = timeToMinutes(block.startTime);
      const end = block.endTime ? timeToMinutes(block.endTime) : 1440;
      const nextBlock = blocks[i + 1];
      
      // Check if we're in this block's time range
      if (minutes >= start && minutes < end) {
        return block;
      }
      
      // If we're exactly at the end time and there's a next block starting now, switch to it
      if (minutes === end && nextBlock && timeToMinutes(nextBlock.startTime) === minutes) {
        return nextBlock;
      }
    }
    
    return undefined;
  }

  function getNextBlock(blocks: any[]) {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return blocks.find(block => timeToMinutes(block.startTime) > minutes);
  }

  function formatTimeRemaining(block: any): string {
    if (!block || !block.endTime) return '';
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const end = timeToMinutes(block.endTime);
    const remaining = end - minutes;
    
    if (remaining <= 0) return '';
    
    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  function getBlockProgress(block: any): number {
    if (!block || !block.endTime) return 0;
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const start = timeToMinutes(block.startTime);
    const end = timeToMinutes(block.endTime);
    const duration = end - start;
    const elapsed = minutes - start;
    return Math.min(Math.max((elapsed / duration) * 100, 0), 100);
  }

  // Reactive declarations that update with currentTime
  $: blocks = ($scheduleBlocks, currentTime, getCurrentDayBlocks());
  $: currentBlock = (currentTime, getCurrentBlock(blocks));
  $: nextBlock = (currentTime, getNextBlock(blocks));
  $: timePosition = (currentTime, getCurrentTimePosition());
  $: console.log('[Timeline] Reactive blocks updated:', blocks.length, blocks);
</script>

<div class="timeline-container glass">
  <div class="timeline-bar-wrapper">
    <div class="timeline-bar">
      {#each blocks as block (block.id)}
        {@const isActive = currentBlock?.id === block.id}
        {@const adjustedWidth = getAdjustedBlockWidth(block, isActive, blocks.length)}
        {@const progress = isActive ? getBlockProgress(block) : 0}
        {@const timeRemaining = isActive ? formatTimeRemaining(block) : ''}
        {@const isUrgent = isActive && timeRemaining && (timeRemaining.includes('m') && !timeRemaining.includes('h') && parseInt(timeRemaining) <= 5)}
        <div 
          class="block"
          class:active={isActive}
          class:urgent={isUrgent}
          style="width: {adjustedWidth}%; background: {block.color}; {isActive ? 'height: 200px;' : ''} {isActive ? `--progress-width: ${progress}%;` : ''}"
          title="{block.name}: {block.startTime} - {block.endTime || 'end'}"
        >
          {#if isActive}
            <!-- Active block content -->
            <div class="active-block-wrapper">
              <span class="time-label-start font-mono">{block.startTime}</span>
              <div class="active-block-content">
                <div class="active-stats font-mono">
                  <div class="stat-card name-card">
                    <div class="activity-name-text">{block.icon || '▪'} {block.name}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-big">{Math.round(progress)}%</div>
                    <div class="stat-small">Done</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-big">{formatTimeRemaining(block) || 'End'}</div>
                    <div class="stat-small">Left</div>
                  </div>
                </div>
              </div>
              <span class="time-label-end font-mono">{block.endTime || 'End'}</span>
            </div>
          {:else}
            <!-- Inactive block content -->
            <span class="block-icon-small">{block.icon || '▪'}</span>
          {/if}
        </div>
      {/each}

      <div class="time-indicator" style="left: {timePosition}%">
        <div class="time-line"></div>
        <div class="time-marker font-mono">
          {formatTime(currentTime, $timeFormat)}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .timeline-container {
    padding: 1.75rem;
    border-radius: 20px;
  }

  .timeline-bar-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .timeline-bar {
    position: relative;
    display: flex;
    align-items: flex-end;
    height: 48px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    overflow: visible;
    padding: 0;
  }

  .block {
    height: 48px;
    position: relative;
    border-right: 1px solid rgba(0, 0, 0, 0.2);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .block:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }

  .block:last-child {
    border-right: none;
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  }

  .block:not(.active):hover {
    filter: brightness(1.15);
  }

  .block.active {
    z-index: 10;
    transform: translateY(-48px);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5),
                inset 0 0 30px rgba(255, 255, 255, 0.1);
    filter: brightness(0.85) saturate(1.1);
    min-width: 320px;
    position: relative;
  }

  .block.active::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    border-radius: 12px;
    pointer-events: none;
    transition: background 0.5s ease;
  }

  .block.active::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(103, 254, 153, 0.4) 0%,
      rgba(103, 254, 153, 0.35) 70%,
      rgba(103, 254, 153, 0.25) 85%,
      rgba(103, 254, 153, 0.1) 95%,
      transparent 100%
    );
    border-radius: 12px;
    pointer-events: none;
    width: var(--progress-width, 0%);
    transition: width 1s ease;
    z-index: 0;
    mask-image: linear-gradient(to right, black 0%, black 90%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 0%, black 90%, transparent 100%);
  }

  .block.urgent::before {
    background: rgba(0, 0, 0, 0.75);
  }

  .block.urgent {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5),
                inset 0 0 30px rgba(255, 255, 255, 0.1),
                0 0 20px rgba(239, 68, 68, 0.3);
  }

  /* Inactive block content */
  .block-icon-small {
    font-size: 1.1rem;
    opacity: 0.85;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  /* Active block wrapper - contains time labels and content */
  .active-block-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 0;
    position: relative;
    z-index: 1;
  }

  /* Active block content - center section with cards */
  .active-block-content {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    padding: 0 1.5rem;
  }

  .time-label-start {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: rgba(103, 254, 153, 1);
    text-shadow: 0 0 8px rgba(103, 254, 153, 0.4);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(103, 254, 153, 0.3);
    border-radius: 6px;
    padding: 0.35rem 0.65rem;
    margin-left: 1rem;
    align-self: flex-end;
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .time-label-end {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: rgba(239, 68, 68, 1);
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    padding: 0.35rem 0.65rem;
    margin-right: 1rem;
    align-self: flex-end;
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .active-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 60%;
    justify-content: center;
    flex: 1;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    height: 100%;
    aspect-ratio: 1.5;
    flex-shrink: 0;
  }

  .stat-card.name-card {
    aspect-ratio: 2.2;
    height: 100%;
  }

  .activity-name-text {
    font-size: 1.15rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.98);
    text-align: center;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    letter-spacing: -0.01em;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .stat-big {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--accent-primary);
    line-height: 1;
    text-shadow: 0 0 8px rgba(103, 254, 153, 0.4);
  }

  .stat-small {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
    font-weight: 600;
  }

  .time-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    pointer-events: none;
    z-index: 10;
  }

  .time-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    background: var(--accent-primary);
    box-shadow: 0 0 12px rgba(103, 254, 153, 0.8),
                0 0 3px rgba(0, 0, 0, 0.8);
    animation: pulse 2s infinite;
  }

  .time-marker {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent-primary);
    color: #0a0a0a;
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
    font-weight: 700;
    white-space: nowrap;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(103, 254, 153, 0.5),
                0 0 0 2px rgba(0, 0, 0, 0.3);
  }

</style>
