<script lang="ts">
  import { onMount } from 'svelte';

  interface WinStats {
    startDate: string | null;
    totalDays: number;
    daysWon: number;
    weeksWon: number;
    monthsWon: number;
    quartersWon: number;
    yearsWon: number;
    currentStreak: number;
    bestStreak: number;
  }

  let stats: WinStats | null = null;
  let loading = true;

  async function loadStats() {
    try {
      const response = await fetch('/api/stats/days-won');
      stats = await response.json();
    } catch (error) {
      console.error('Failed to load win stats:', error);
    } finally {
      loading = false;
    }
  }

  function getWinRate(won: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((won / total) * 100);
  }

  function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  }

  onMount(() => {
    loadStats();
  });
</script>

<div class="wins-tile">
  <div class="tile-header">
    <span class="tile-icon">&#127942;</span>
    <h3>Days Won</h3>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="loader"></div>
    </div>
  {:else if !stats || !stats.startDate}
    <div class="empty-state">
      <span class="empty-icon">&#128200;</span>
      <p>Start tracking habits to see wins</p>
    </div>
  {:else}
    <div class="wins-content">
      <!-- Main Win Counter -->
      <div class="main-counter">
        <div class="counter-ring">
          <svg viewBox="0 0 100 100" class="progress-ring">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="6"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="url(#winGradient)"
              stroke-width="6"
              stroke-linecap="round"
              stroke-dasharray="{getWinRate(stats.daysWon, stats.totalDays) * 2.64} 264"
              transform="rotate(-90 50 50)"
              class="progress-arc"
            />
            <defs>
              <linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#67fe99" />
                <stop offset="100%" stop-color="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div class="counter-content">
            <span class="counter-value">{formatNumber(stats.daysWon)}</span>
            <span class="counter-label">days won</span>
          </div>
        </div>
        <div class="win-rate">
          <span class="rate-value">{getWinRate(stats.daysWon, stats.totalDays)}%</span>
          <span class="rate-label">win rate</span>
        </div>
      </div>

      <!-- Streak Display -->
      <div class="streak-bar">
        <div class="streak current">
          <span class="streak-icon">&#128293;</span>
          <span class="streak-value">{stats.currentStreak}</span>
          <span class="streak-label">streak</span>
        </div>
        <div class="streak-divider"></div>
        <div class="streak best">
          <span class="streak-icon">&#11088;</span>
          <span class="streak-value">{stats.bestStreak}</span>
          <span class="streak-label">best</span>
        </div>
      </div>

      <!-- Period Wins Grid -->
      <div class="period-wins">
        <div class="period-item">
          <span class="period-value">{stats.weeksWon}</span>
          <span class="period-label">weeks</span>
        </div>
        <div class="period-item">
          <span class="period-value">{stats.monthsWon}</span>
          <span class="period-label">months</span>
        </div>
        <div class="period-item">
          <span class="period-value">{stats.quartersWon}</span>
          <span class="period-label">quarters</span>
        </div>
        <div class="period-item">
          <span class="period-value">{stats.yearsWon}</span>
          <span class="period-label">years</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .wins-tile {
    background: linear-gradient(
      135deg,
      rgba(18, 18, 18, 0.95) 0%,
      rgba(22, 22, 28, 0.92) 100%
    );
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .wins-tile::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(251, 191, 36, 0.3) 50%,
      transparent 100%
    );
  }

  .tile-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tile-icon {
    font-size: 1rem;
    filter: grayscale(0.2);
  }

  .tile-header h3 {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
  }

  .loading-state,
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .loader {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(251, 191, 36, 0.2);
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .empty-state p {
    font-size: 0.8rem;
    margin: 0;
    text-align: center;
  }

  .wins-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .main-counter {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .counter-ring {
    position: relative;
    width: 65px;
    height: 65px;
    flex-shrink: 0;
  }

  .progress-ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .progress-arc {
    transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .counter-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .counter-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.15rem;
    font-weight: 700;
    color: #67fe99;
    line-height: 1;
    text-shadow: 0 0 20px rgba(103, 254, 153, 0.4);
  }

  .counter-label {
    font-size: 0.48rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .win-rate {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }

  .rate-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.65rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .rate-label {
    font-size: 0.62rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .streak-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .streak {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
    justify-content: center;
  }

  .streak-icon {
    font-size: 0.9rem;
  }

  .streak-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .streak-label {
    font-size: 0.62rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
  }

  .streak-divider {
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
  }

  .streak.current .streak-value {
    color: #fb923c;
    text-shadow: 0 0 12px rgba(251, 146, 60, 0.4);
  }

  .streak.best .streak-value {
    color: #fbbf24;
    text-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
  }

  .period-wins {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }

  .period-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
    padding: 0.35rem 0.2rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 7px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.2s;
  }

  .period-item:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .period-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .period-label {
    font-size: 0.52rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
</style>
