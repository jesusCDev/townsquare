<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { timeFormat } from '$lib/stores/timeFormat';

  let activeTab: 'habits' | 'schedule' | 'alerts' | 'settings' = 'habits';

  // Habits
  let habits: any[] = [];
  let newHabit = {
    name: '',
    icon: '',
    color: '#3b82f6',
    targetCount: 1,
  };
  let editingHabit: any = null;
  let draggedHabitId: string | null = null;

  // Schedule
  let scheduleBlocks: any[] = [];
  let editingBlock: any = null;
  
  $: allDayBlocks = scheduleBlocks.filter(b => b.daysMask === 127);
  $: weekdayBlocks = scheduleBlocks.filter(b => b.daysMask === 31);
  $: weekendBlocks = scheduleBlocks.filter(b => b.daysMask === 96);
  $: customBlocks = scheduleBlocks.filter(b => b.daysMask !== 127 && b.daysMask !== 31 && b.daysMask !== 96);
  let newBlock = {
    name: '',
    icon: '',
    color: '#3b82f6',
    startTime: '09:00',
    endTime: '10:00',
    daysMask: 127, // All days
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Reactive keys to force UI updates
  $: scheduleKey = newBlock.daysMask;
  $: alertKey = newAlert.daysMask;
  $: editBlockKey = editingBlock?.daysMask ?? 0;
  $: editAlertKey = editingAlert?.daysMask ?? 0;

  // Alerts
  let alerts: any[] = [];
  let newAlert = {
    name: '',
    time: '09:00',
    daysMask: 31, // Weekdays by default
    gracePeriod: 5,
  };
  let editingAlert: any = null;

  // Settings
  let dimTimeout = 15;
  let nightModeStart = '20:00';
  let nightModeEnd = '06:00';

  onMount(async () => {
    await loadHabits();
    await loadSchedule();
    await loadAlerts();
    await loadSettings();
  });

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.settings) {
        dimTimeout = data.settings.dimTimeout || 15;
        nightModeStart = data.settings['nightMode.start'] || '20:00';
        nightModeEnd = data.settings['nightMode.end'] || '06:00';
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function saveSetting(key: string, value: any) {
    try {
      await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error('Failed to save setting:', error);
      alert('Failed to save setting');
    }
  }

  async function loadHabits() {
    const response = await fetch('/api/habits');
    const data = await response.json();
    habits = data.habits || [];
  }

  async function loadSchedule() {
    const response = await fetch('/api/schedule');
    const data = await response.json();
    scheduleBlocks = data.blocks || [];
  }

  async function loadAlerts() {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      alerts = data.alerts || [];
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  async function createAlert() {
    if (!newAlert.name) {
      alert('Alert name is required');
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
      });

      if (response.ok) {
        await loadAlerts();
        newAlert = { name: '', time: '09:00', daysMask: 31, gracePeriod: 5 };
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert');
    }
  }

  async function deleteAlert(id: string) {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      await loadAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  }

  function toggleAlertDay(dayIndex: number) {
    const mask = 1 << dayIndex;
    newAlert.daysMask = newAlert.daysMask ^ mask;
    // Force reactivity by creating a new reference
    newAlert = { ...newAlert };
  }

  function isAlertDaySelected(dayIndex: number): boolean {
    return (newAlert.daysMask & (1 << dayIndex)) !== 0;
  }

  function startEditAlert(alertItem: any) {
    editingAlert = { ...alertItem };
  }

  function cancelEditAlert() {
    editingAlert = null;
  }

  async function saveEditAlert() {
    if (!editingAlert) return;

    try {
      await fetch(`/api/alerts/${editingAlert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAlert.name,
          time: editingAlert.time,
          daysMask: editingAlert.daysMask,
          gracePeriod: editingAlert.gracePeriod,
        }),
      });
      await loadAlerts();
      editingAlert = null;
    } catch (error) {
      console.error('Failed to update alert:', error);
      alert('Failed to update alert');
    }
  }

  function toggleEditAlertDay(dayIndex: number) {
    if (!editingAlert) return;
    const mask = 1 << dayIndex;
    editingAlert.daysMask = editingAlert.daysMask ^ mask;
    editingAlert = { ...editingAlert };
  }

  function isEditAlertDaySelected(dayIndex: number): boolean {
    return editingAlert && (editingAlert.daysMask & (1 << dayIndex)) !== 0;
  }

  function setEditAlertDayPreset(preset: 'all' | 'weekdays' | 'weekend') {
    if (!editingAlert) return;
    if (preset === 'all') {
      editingAlert.daysMask = 127;
    } else if (preset === 'weekdays') {
      editingAlert.daysMask = 31;
    } else if (preset === 'weekend') {
      editingAlert.daysMask = 96;
    }
    editingAlert = { ...editingAlert };
  }

  function setAlertDayPreset(preset: 'all' | 'weekdays' | 'weekend') {
    if (preset === 'all') {
      newAlert.daysMask = 127;
    } else if (preset === 'weekdays') {
      newAlert.daysMask = 31;
    } else if (preset === 'weekend') {
      newAlert.daysMask = 96;
    }
    // Force reactivity by creating a new reference
    newAlert = { ...newAlert };
  }

  function getDayMaskLabel(daysMask: number): string {
    if (daysMask === 127) return 'Every day';
    if (daysMask === 31) return 'Weekdays';
    if (daysMask === 96) return 'Weekend';
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      if ((daysMask & (1 << i)) !== 0) {
        days.push(dayNames[i]);
      }
    }
    return days.join(', ');
  }

  async function createHabit() {
    if (!newHabit.name) {
      alert('Habit name is required');
      return;
    }

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit),
      });

      if (response.ok) {
        await loadHabits();
        newHabit = { name: '', icon: '', color: '#3b82f6', targetCount: 1 };
      }
    } catch (error) {
      console.error('Failed to create habit:', error);
      alert('Failed to create habit');
    }
  }

  async function deleteHabit(id: string) {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
      await fetch(`/api/habits/${id}`, { method: 'DELETE' });
      await loadHabits();
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  }

  function startEditHabit(habit: any) {
    editingHabit = {
      ...habit,
      timedWindows: habit.timedWindows ? JSON.parse(habit.timedWindows) : [{ start: '07:00', end: '09:00', days: 127 }]
    };
  }

  async function saveEditHabit() {
    if (!editingHabit) return;

    try {
      await fetch(`/api/habits/${editingHabit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingHabit.name,
          icon: editingHabit.icon,
          color: editingHabit.color,
          targetCount: editingHabit.targetCount,
          timedWindows: editingHabit.timedWindows
        }),
      });
      await loadHabits();
      editingHabit = null;
    } catch (error) {
      console.error('Failed to update habit:', error);
    }
  }

  function cancelEdit() {
    editingHabit = null;
  }

  function addTimeWindow() {
    if (!editingHabit) return;
    editingHabit.timedWindows.push({ start: '07:00', end: '09:00', days: 127 });
    editingHabit = editingHabit; // Trigger reactivity
  }

  function removeTimeWindow(index: number) {
    if (!editingHabit) return;
    editingHabit.timedWindows.splice(index, 1);
    editingHabit = editingHabit; // Trigger reactivity
  }

  async function handleHabitDragStart(habitId: string) {
    draggedHabitId = habitId;
  }

  async function handleHabitDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function handleHabitDrop(targetHabitId: string) {
    if (!draggedHabitId || draggedHabitId === targetHabitId) {
      draggedHabitId = null;
      return;
    }

    const draggedIdx = habits.findIndex(h => h.id === draggedHabitId);
    const targetIdx = habits.findIndex(h => h.id === targetHabitId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;

    // Reorder locally
    const reordered = [...habits];
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

  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Format time string (HH:MM) based on user's time format preference
  function formatTimeStr(time: string, format: '12' | '24'): string {
    if (format === '24' || !time) return time;

    const [hours, mins] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  // Get schedule preview for a specific day mask, including the new block being added
  type PreviewSlot = { name: string; icon: string; startTime: string; endTime: string; color: string; isAvailable: boolean; isNewBlock: boolean };

  // Helper to expand blocks - handles overnight blocks by splitting them
  type ExpandedBlock = { name: string; icon: string; startMinutes: number; endMinutes: number; isExisting: boolean };

  function expandBlock(block: { name: string; icon: string; startTime: string; endTime: string; isExisting: boolean }): ExpandedBlock[] {
    const startMinutes = timeToMinutes(block.startTime);
    const endMinutes = block.endTime ? timeToMinutes(block.endTime) : 1440;

    // Check if this is an overnight block (end time is before start time, e.g., 22:00-06:00)
    if (endMinutes <= startMinutes && block.endTime && block.endTime !== '24:00') {
      // Split into two segments: start->midnight and midnight->end
      return [
        { ...block, startMinutes: 0, endMinutes: endMinutes },           // 00:00 to end (morning portion)
        { ...block, startMinutes: startMinutes, endMinutes: 1440 },      // start to 24:00 (evening portion)
      ];
    }

    return [{ ...block, startMinutes, endMinutes }];
  }

  function getScheduleForDayMask(dayMask: number, newBlockData: typeof newBlock): PreviewSlot[] {
    if (dayMask === 0) return [];

    // Get existing blocks that apply to this specific day pattern
    const rawBlocks = scheduleBlocks
      .filter(block => (block.daysMask & dayMask) !== 0)
      .map(block => ({
        name: block.name,
        icon: block.icon || '',
        startTime: block.startTime,
        endTime: block.endTime || '24:00',
        isExisting: true,
      }));

    // Add the new block being created if it has valid times and applies to this day
    if (newBlockData.startTime && (newBlockData.daysMask & dayMask) !== 0) {
      rawBlocks.push({
        name: newBlockData.name || 'New Block',
        icon: newBlockData.icon || '➕',
        startTime: newBlockData.startTime,
        endTime: newBlockData.endTime || '24:00',
        isExisting: false,
      });
    }

    // Expand all blocks (handles overnight blocks)
    const expandedBlocks: ExpandedBlock[] = [];
    for (const block of rawBlocks) {
      expandedBlocks.push(...expandBlock(block));
    }

    // Sort by start time
    expandedBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

    const preview: PreviewSlot[] = [];
    let lastEndMinutes = 0;

    for (const block of expandedBlocks) {
      // Add available time gap if there's space before this block
      if (block.startMinutes > lastEndMinutes) {
        preview.push({
          name: 'Available',
          icon: '',
          startTime: minutesToTime(lastEndMinutes),
          endTime: minutesToTime(block.startMinutes),
          color: '#22c55e',
          isAvailable: true,
          isNewBlock: false,
        });
      }

      // Scheduled block (existing = red, new = blue)
      preview.push({
        name: block.name,
        icon: block.icon,
        startTime: minutesToTime(block.startMinutes),
        endTime: minutesToTime(block.endMinutes),
        color: block.isExisting ? '#ef4444' : '#3b82f6',
        isAvailable: false,
        isNewBlock: !block.isExisting,
      });

      lastEndMinutes = Math.max(lastEndMinutes, block.endMinutes);
    }

    // Add available time at the end if needed
    if (lastEndMinutes < 1440) {
      preview.push({
        name: 'Available',
        icon: '',
        startTime: minutesToTime(lastEndMinutes),
        endTime: '24:00',
        color: '#22c55e',
        isAvailable: true,
        isNewBlock: false,
      });
    }

    return preview;
  }

  // Determine which preview rows to show based on selected days
  type PreviewRow = { label: string; dayMask: number; slots: PreviewSlot[] };

  function getSchedulePreviews(daysMask: number, newBlockData: typeof newBlock, _blocks: typeof scheduleBlocks): PreviewRow[] {
    if (daysMask === 0) return [];

    const hasWeekdays = (daysMask & 31) !== 0;  // Mon-Fri bits
    const hasWeekend = (daysMask & 96) !== 0;   // Sat-Sun bits

    const rows: PreviewRow[] = [];

    if (hasWeekdays && hasWeekend) {
      // Show both weekday and weekend rows
      rows.push({
        label: 'Weekdays (Mon-Fri)',
        dayMask: daysMask & 31,
        slots: getScheduleForDayMask(daysMask & 31, newBlockData),
      });
      rows.push({
        label: 'Weekend (Sat-Sun)',
        dayMask: daysMask & 96,
        slots: getScheduleForDayMask(daysMask & 96, newBlockData),
      });
    } else if (hasWeekdays) {
      rows.push({
        label: 'Weekdays',
        dayMask: daysMask & 31,
        slots: getScheduleForDayMask(daysMask & 31, newBlockData),
      });
    } else if (hasWeekend) {
      rows.push({
        label: 'Weekend',
        dayMask: daysMask & 96,
        slots: getScheduleForDayMask(daysMask & 96, newBlockData),
      });
    }

    return rows;
  }

  // Reactive previews - depends on daysMask, newBlock times, and scheduleBlocks
  $: schedulePreviews = getSchedulePreviews(newBlock.daysMask, newBlock, scheduleBlocks);

  function checkScheduleOverlap(startTime: string, endTime: string, daysMask: number): string | null {
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    if (newStart >= newEnd) {
      return 'End time must be after start time';
    }

    // Check each day that's selected
    for (let day = 0; day < 7; day++) {
      const dayBit = 1 << day;
      if ((daysMask & dayBit) === 0) continue; // Skip unselected days

      // Check against existing blocks
      for (const block of scheduleBlocks) {
        if ((block.daysMask & dayBit) === 0) continue; // Skip if block not on this day

        const existingStart = timeToMinutes(block.startTime);
        const existingEnd = block.endTime ? timeToMinutes(block.endTime) : 1440;

        // Allow exact matches (4-7, 7-9 is OK)
        if (newEnd === existingStart || newStart === existingEnd) continue;

        // Check for overlap
        if (newStart < existingEnd && newEnd > existingStart) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return `Overlaps with "${block.name}" on ${dayNames[day]}`;
        }
      }
    }

    return null; // No overlap
  }

  function smartDetectEndTime(startTime: string, endTime: string | null, daysMask: number, excludeId?: string) {
    if (endTime) return endTime; // User provided end time

    // Find the next block that starts after this start time for any overlapping day
    let earliestNextStart: string | null = null;
    let earliestMinutes = Infinity;

    const startMinutes = timeToMinutes(startTime);

    for (const block of scheduleBlocks) {
      if (excludeId && block.id === excludeId) continue; // Skip self when editing
      
      // Check if blocks share any days
      if ((block.daysMask & daysMask) === 0) continue;

      const blockStartMinutes = timeToMinutes(block.startTime);
      
      // Find blocks that start after our start time
      if (blockStartMinutes > startMinutes && blockStartMinutes < earliestMinutes) {
        earliestMinutes = blockStartMinutes;
        earliestNextStart = block.startTime;
      }
    }

    return earliestNextStart;
  }

  async function createScheduleBlock() {
    if (!newBlock.name) {
      alert('Block name is required');
      return;
    }

    // Smart end time detection
    const smartEndTime = smartDetectEndTime(newBlock.startTime, newBlock.endTime, newBlock.daysMask);
    const finalBlock = { ...newBlock, endTime: smartEndTime };

    // Check for overlaps
    const overlapError = checkScheduleOverlap(finalBlock.startTime, finalBlock.endTime, finalBlock.daysMask);
    if (overlapError) {
      alert(`Cannot create schedule block: ${overlapError}`);
      return;
    }

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBlock),
      });

      if (response.ok) {
        await loadSchedule();
        newBlock = { 
          name: '', 
          icon: '', 
          color: '#3b82f6', 
          startTime: '09:00', 
          endTime: '',
          daysMask: 127 
        };
      }
    } catch (error) {
      console.error('Failed to create schedule block:', error);
      alert('Failed to create schedule block');
    }
  }

  function startEditBlock(block: any) {
    editingBlock = { ...block };
  }

  function cancelEditBlock() {
    editingBlock = null;
  }

  async function saveEditBlock() {
    if (!editingBlock) return;

    // Smart end time detection
    const smartEndTime = smartDetectEndTime(editingBlock.startTime, editingBlock.endTime, editingBlock.daysMask, editingBlock.id);
    editingBlock.endTime = smartEndTime;

    // Check for overlaps (excluding self)
    const overlapError = checkScheduleOverlapExcluding(editingBlock.startTime, editingBlock.endTime, editingBlock.daysMask, editingBlock.id);
    if (overlapError) {
      alert(`Cannot update schedule block: ${overlapError}`);
      return;
    }

    try {
      await fetch(`/api/schedule/${editingBlock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBlock.name,
          icon: editingBlock.icon,
          color: editingBlock.color,
          startTime: editingBlock.startTime,
          endTime: editingBlock.endTime,
          daysMask: editingBlock.daysMask,
        }),
      });
      await loadSchedule();
      editingBlock = null;
    } catch (error) {
      console.error('Failed to update schedule block:', error);
      alert('Failed to update schedule block');
    }
  }

  function toggleEditBlockDay(dayIndex: number) {
    if (!editingBlock) return;
    const mask = 1 << dayIndex;
    editingBlock.daysMask = editingBlock.daysMask ^ mask;
    // Force reactivity by creating a new reference
    editingBlock = { ...editingBlock };
  }

  function isEditBlockDaySelected(dayIndex: number): boolean {
    return editingBlock && (editingBlock.daysMask & (1 << dayIndex)) !== 0;
  }

  function checkScheduleOverlapExcluding(startTime: string, endTime: string | null, daysMask: number, excludeId: string) {
    const start = timeToMinutes(startTime);
    const end = endTime ? timeToMinutes(endTime) : 1440;

    for (const block of scheduleBlocks) {
      if (block.id === excludeId) continue; // Skip self
      
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = block.endTime ? timeToMinutes(block.endTime) : 1440;

      for (let day = 0; day < 7; day++) {
        const dayBit = 1 << day;
        if ((daysMask & dayBit) === 0 || (block.daysMask & dayBit) === 0) continue;

        const hasPartialOverlap = 
          (start < blockEnd && end > blockStart) && // Times overlap
          !(start === blockEnd || end === blockStart); // But not just touching

        if (hasPartialOverlap) {
          return `Overlaps with "${block.name}" on ${dayNames[day]}`;
        }
      }
    }

    return null;
  }

  function toggleDay(dayIndex: number) {
    const mask = 1 << dayIndex;
    newBlock.daysMask = newBlock.daysMask ^ mask;
    // Force reactivity by creating a new reference
    newBlock = { ...newBlock };
  }

  function isDaySelected(dayIndex: number): boolean {
    return (newBlock.daysMask & (1 << dayIndex)) !== 0;
  }

  function setDayPreset(preset: 'all' | 'weekdays' | 'weekend') {
    if (preset === 'all') {
      newBlock.daysMask = 127; // All days
    } else if (preset === 'weekdays') {
      newBlock.daysMask = 31; // Mon-Fri (bits 1-5)
    } else if (preset === 'weekend') {
      newBlock.daysMask = 96; // Sat-Sun (bits 6-7)
    }
    // Force reactivity by creating a new reference
    newBlock = { ...newBlock };
  }

  async function deleteScheduleBlock(id: string) {
    if (!confirm('Are you sure you want to delete this schedule block?')) return;

    try {
      await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
      await loadSchedule();
    } catch (error) {
      console.error('Failed to delete schedule block:', error);
    }
  }

  async function exportBackup() {
    try {
      const response = await fetch('/api/backup/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeboard-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('Backup exported successfully!');
    } catch (error) {
      console.error('Failed to export backup:', error);
      alert('Failed to export backup');
    }
  }

  async function importBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    if (!confirm('This will replace all current data with the backup. Are you sure?')) {
      input.value = '';
      return;
    }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });

      if (response.ok) {
        alert('Backup imported successfully! Refreshing page...');
        window.location.reload();
      } else {
        alert('Failed to import backup');
      }
    } catch (error) {
      console.error('Failed to import backup:', error);
      alert('Failed to import backup. Make sure the file is valid.');
    } finally {
      input.value = '';
    }
  }
</script>

<svelte:head>
  <title>Settings - LifeBoard</title>
</svelte:head>

<div class="settings-page">
  <div class="header">
    <h1>⚙️ Settings</h1>
    <button class="back-btn" on:click={() => goto('/')}>← Back to Dashboard</button>
  </div>

  <div class="tabs">
    <button 
      class="tab" 
      class:active={activeTab === 'habits'}
      on:click={() => activeTab = 'habits'}
    >
      Habits
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'schedule'}
      on:click={() => activeTab = 'schedule'}
    >
      Schedule
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'alerts'}
      on:click={() => activeTab = 'alerts'}
    >
      Alerts
    </button>
    <button 
      class="tab" 
      class:active={activeTab === 'settings'}
      on:click={() => activeTab = 'settings'}
    >
      Settings
    </button>
  </div>

  {#if activeTab === 'habits'}
    <div class="section">
      <h2>Add New Habit</h2>
      <form class="form" on:submit|preventDefault={createHabit}>
        <div class="form-row">
          <input
            type="text"
            bind:value={newHabit.name}
            placeholder="Habit name (e.g., Workout)"
            required
          />
          <input
            type="text"
            bind:value={newHabit.icon}
            placeholder="Icon (emoji)"
            maxlength="2"
          />
          <input
            type="number"
            bind:value={newHabit.targetCount}
            min="1"
            max="10"
            placeholder="Target count"
          />
          <button type="submit" class="save-btn-form">
            <span class="btn-icon">✓</span> Add Habit
          </button>
        </div>
      </form>

      <h2>Existing Habits</h2>
      <div class="items-list">
        {#each habits as habit (habit.id)}
          <div 
            class="item draggable"
            draggable="true"
            on:dragstart={() => handleHabitDragStart(habit.id)}
            on:dragover={handleHabitDragOver}
            on:drop={() => handleHabitDrop(habit.id)}
          >
            <span class="drag-handle">⋮⋮</span>
            <span class="icon">{habit.icon || '●'}</span>
            <span class="name">{habit.name}</span>
            <span class="badge" style="background: {habit.color};">
              Target: {habit.targetCount}x
            </span>
            <button class="edit-btn" on:click={() => startEditHabit(habit)}>
              Edit
            </button>
            <button class="delete-btn" on:click={() => deleteHabit(habit.id)}>
              Delete
            </button>
          </div>
        {/each}
      </div>
    </div>

    <!-- Edit Habit Modal -->
    {#if editingHabit}
      <div class="modal-overlay" on:click={cancelEdit}>
        <div class="modal" on:click|stopPropagation>
          <h2>Edit Habit</h2>
          
          <div class="form">
            <div class="form-group">
              <label>Habit Name</label>
              <input
                type="text"
                bind:value={editingHabit.name}
                placeholder="e.g., Workout"
                class="input-field"
              />
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label>Icon</label>
                <input
                  type="text"
                  bind:value={editingHabit.icon}
                  placeholder="🏋️"
                  maxlength="2"
                  class="input-field"
                />
              </div>
              <div class="form-group" style="flex: 1;">
                <label>Visual Color</label>
                <div class="color-picker-wrapper">
                  <div class="color-preview" style="background-color: {editingHabit.color};"></div>
                  <input
                    type="color"
                    bind:value={editingHabit.color}
                    class="color-input"
                  />
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Daily Target (how many times per day)</label>
              <input
                type="number"
                bind:value={editingHabit.targetCount}
                min="1"
                placeholder="1"
                class="input-field"
              />
            </div>

            <h3>Reminder Times (optional)</h3>
            <p class="help-text">Set times when you want to be alerted if this habit isn't completed yet</p>
            {#each editingHabit.timedWindows as window, i}
              <div class="time-window">
                <div class="time-row">
                  <div class="form-group">
                    <label>Alert at</label>
                    <input type="time" bind:value={window.start} class="input-field" />
                  </div>
                  <div class="form-group">
                    <label>Days</label>
                    <div class="days-selector-compact">
                      {#each dayNames as day, dayIdx}
                        <button
                          type="button"
                          class="day-btn-small"
                          class:selected={(window.days & (1 << dayIdx)) !== 0}
                          on:click={() => {
                            window.days = window.days ^ (1 << dayIdx);
                            editingHabit = editingHabit;
                          }}
                        >
                          {day[0]}
                        </button>
                      {/each}
                    </div>
                  </div>
                  {#if editingHabit.timedWindows.length > 1}
                    <button type="button" class="remove-window-btn" on:click={() => removeTimeWindow(i)}>×</button>
                  {/if}
                </div>
              </div>
            {/each}
            
            <button type="button" class="add-window-btn" on:click={addTimeWindow}>
              + Add Reminder Time
            </button>

            <div class="modal-actions">
              <button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
              <button class="save-btn" on:click={saveEditHabit}>Save</button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {:else if activeTab === 'schedule'}
    <div class="section">
      <h2>Add Schedule Block</h2>
      <form class="form" on:submit|preventDefault={createScheduleBlock}>
        <div class="form-row">
          <input
            type="text"
            bind:value={newBlock.name}
            placeholder="Block name (e.g., Work)"
            required
          />
          <input
            type="text"
            bind:value={newBlock.icon}
            placeholder="Icon (emoji)"
            maxlength="2"
          />
          <input
            type="color"
            bind:value={newBlock.color}
          />
        </div>
        <div class="form-row">
          <label>
            Start Time:
            <input type="time" bind:value={newBlock.startTime} required />
          </label>
          <label>
            End Time:
            <input type="time" bind:value={newBlock.endTime} />
          </label>
        </div>
        <div class="form-row">
          <label>Days:</label>
          <div class="days-controls">
            <div class="preset-buttons">
              <button type="button" class="preset-btn" on:click={() => setDayPreset('all')}>
                All Days
              </button>
              <button type="button" class="preset-btn" on:click={() => setDayPreset('weekdays')}>
                Weekdays
              </button>
              <button type="button" class="preset-btn" on:click={() => setDayPreset('weekend')}>
                Weekend
              </button>
            </div>
            <div class="days-selector">
              {#each dayNames as day, i}
                <button
                  type="button"
                  class="day-btn"
                  class:selected={(scheduleKey & (1 << i)) !== 0}
                  on:click={() => toggleDay(i)}
                >
                  {day}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Schedule Preview Timeline -->
        {#if schedulePreviews.length > 0}
          <div class="schedule-preview">
            <label>Availability for Selected Days:</label>
            <div class="preview-legend">
              <span class="legend-item"><span class="legend-color available"></span> Available</span>
              <span class="legend-item"><span class="legend-color scheduled"></span> Scheduled</span>
              <span class="legend-item"><span class="legend-color new-block"></span> Adding</span>
            </div>
            {#each schedulePreviews as row}
              <div class="preview-row">
                <div class="preview-row-label">{row.label}</div>
                <div class="preview-timeline">
                  {#each row.slots as slot}
                    {@const startMins = timeToMinutes(slot.startTime)}
                    {@const endMins = slot.endTime === '24:00' ? 1440 : timeToMinutes(slot.endTime)}
                    {@const widthPercent = ((endMins - startMins) / 1440) * 100}
                    <div
                      class="preview-slot"
                      class:available={slot.isAvailable}
                      class:scheduled={!slot.isAvailable && !slot.isNewBlock}
                      class:new-block={slot.isNewBlock}
                      style="width: {widthPercent}%;"
                      title="{slot.name}: {formatTimeStr(slot.startTime, $timeFormat)} - {formatTimeStr(slot.endTime, $timeFormat)}"
                    >
                      {#if widthPercent > 6 && slot.icon}
                        <span class="slot-icon">{slot.icon}</span>
                      {/if}
                      {#if widthPercent > 12}
                        <span class="slot-label">{formatTimeStr(slot.startTime, $timeFormat)}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
            <div class="preview-times">
              <span>{formatTimeStr('00:00', $timeFormat)}</span>
              <span>{formatTimeStr('06:00', $timeFormat)}</span>
              <span>{formatTimeStr('12:00', $timeFormat)}</span>
              <span>{formatTimeStr('18:00', $timeFormat)}</span>
              <span>{$timeFormat === '12' ? '12:00 AM' : '24:00'}</span>
            </div>
          </div>
        {/if}

        <button type="submit" class="save-btn-form">
          <span class="btn-icon">✓</span> Save Schedule Block
        </button>
      </form>

      <h2>Existing Schedule</h2>
      
      {#if allDayBlocks.length > 0}
        <h3 class="section-subtitle">All Days</h3>
        <div class="items-list">
          {#each allDayBlocks as block (block.id)}
            <div class="item">
              <span class="icon">{block.icon || '●'}</span>
              <span class="name">{block.name}</span>
              <span class="time">{formatTimeStr(block.startTime, $timeFormat)} - {block.endTime ? formatTimeStr(block.endTime, $timeFormat) : 'end'}</span>
              <span class="badge" style="background: {block.color};">Every day</span>
              <button class="edit-btn" on:click={() => startEditBlock(block)}>
                Edit
              </button>
              <button class="delete-btn" on:click={() => deleteScheduleBlock(block.id)}>
                Delete
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if weekdayBlocks.length > 0}
        <h3 class="section-subtitle">Weekdays</h3>
        <div class="items-list">
          {#each weekdayBlocks as block (block.id)}
            <div class="item">
              <span class="icon">{block.icon || '●'}</span>
              <span class="name">{block.name}</span>
              <span class="time">{formatTimeStr(block.startTime, $timeFormat)} - {block.endTime ? formatTimeStr(block.endTime, $timeFormat) : 'end'}</span>
              <span class="badge" style="background: {block.color};">Mon-Fri</span>
              <button class="edit-btn" on:click={() => startEditBlock(block)}>
                Edit
              </button>
              <button class="delete-btn" on:click={() => deleteScheduleBlock(block.id)}>
                Delete
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if weekendBlocks.length > 0}
        <h3 class="section-subtitle">Weekend</h3>
        <div class="items-list">
          {#each weekendBlocks as block (block.id)}
            <div class="item">
              <span class="icon">{block.icon || '●'}</span>
              <span class="name">{block.name}</span>
              <span class="time">{formatTimeStr(block.startTime, $timeFormat)} - {block.endTime ? formatTimeStr(block.endTime, $timeFormat) : 'end'}</span>
              <span class="badge" style="background: {block.color};">Sat-Sun</span>
              <button class="edit-btn" on:click={() => startEditBlock(block)}>
                Edit
              </button>
              <button class="delete-btn" on:click={() => deleteScheduleBlock(block.id)}>
                Delete
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if customBlocks.length > 0}
        <h3 class="section-subtitle">Custom</h3>
        <div class="items-list">
          {#each customBlocks as block (block.id)}
            <div class="item">
              <span class="icon">{block.icon || '●'}</span>
              <span class="name">{block.name}</span>
              <span class="time">{formatTimeStr(block.startTime, $timeFormat)} - {block.endTime ? formatTimeStr(block.endTime, $timeFormat) : 'end'}</span>
              <span class="badge" style="background: {block.color};">Custom</span>
              <button class="edit-btn" on:click={() => startEditBlock(block)}>
                Edit
              </button>
              <button class="delete-btn" on:click={() => deleteScheduleBlock(block.id)}>
                Delete
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if scheduleBlocks.length === 0}
        <p class="empty-message">No schedule blocks yet. Create one above to get started.</p>
      {/if}
    </div>

    <!-- Edit Schedule Block Modal -->
    {#if editingBlock}
      <div class="modal-overlay" on:click={cancelEditBlock}>
        <div class="modal" on:click|stopPropagation>
          <h2>Edit Schedule Block</h2>
          
          <div class="form">
            <div class="form-row">
              <div class="form-group">
                <label>Block Name</label>
                <input
                  type="text"
                  bind:value={editingBlock.name}
                  placeholder="e.g., Work"
                  class="input-field"
                />
              </div>
              <div class="form-group">
                <label>Icon</label>
                <input
                  type="text"
                  bind:value={editingBlock.icon}
                  placeholder="Emoji"
                  maxlength="2"
                  class="input-field"
                />
              </div>
              <div class="form-group">
                <label>Color</label>
                <input
                  type="color"
                  bind:value={editingBlock.color}
                  class="color-input"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Start Time</label>
                <input type="time" bind:value={editingBlock.startTime} class="input-field" />
              </div>
              <div class="form-group">
                <label>End Time</label>
                <input type="time" bind:value={editingBlock.endTime} class="input-field" placeholder="Auto-detect" />
              </div>
            </div>

            <div class="form-group">
              <label>Days</label>
              <div class="days-selector">
                {#each dayNames as day, dayIdx}
                  <button
                    type="button"
                    class="day-btn"
                    class:selected={(editBlockKey & (1 << dayIdx)) !== 0}
                    on:click={() => toggleEditBlockDay(dayIdx)}
                  >
                    {day}
                  </button>
                {/each}
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" on:click={cancelEditBlock}>Cancel</button>
              <button class="save-btn" on:click={saveEditBlock}>Save</button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {:else if activeTab === 'alerts'}
    <div class="section">
      <h2>Add New Alert</h2>
      <form class="form" on:submit|preventDefault={createAlert}>
        <div class="form-row">
          <label>
            Alert Name:
            <input
              type="text"
              bind:value={newAlert.name}
              placeholder="e.g., Morning Meeting"
              required
            />
          </label>
        </div>
        <div class="form-row">
          <label>
            Time:
            <input type="time" bind:value={newAlert.time} required />
          </label>
          <label>
            Grace Period (minutes):
            <input
              type="number"
              bind:value={newAlert.gracePeriod}
              min="0"
              max="60"
              placeholder="5"
            />
          </label>
        </div>
        <div class="form-row">
          <label>Days:</label>
          <div class="days-controls">
            <div class="preset-buttons">
              <button type="button" class="preset-btn" on:click={() => setAlertDayPreset('all')}>
                All Days
              </button>
              <button type="button" class="preset-btn" on:click={() => setAlertDayPreset('weekdays')}>
                Weekdays
              </button>
              <button type="button" class="preset-btn" on:click={() => setAlertDayPreset('weekend')}>
                Weekend
              </button>
            </div>
            <div class="days-selector">
              {#each dayNames as day, i}
                <button
                  type="button"
                  class="day-btn"
                  class:selected={(alertKey & (1 << i)) !== 0}
                  on:click={() => toggleAlertDay(i)}
                >
                  {day}
                </button>
              {/each}
            </div>
          </div>
        </div>
        <button type="submit" class="save-btn-form">
          <span class="btn-icon">✓</span> Save Alert
        </button>
      </form>

      <h2>Existing Alerts</h2>
      <div class="items-list">
        {#each alerts as alertItem (alertItem.id)}
          <div class="item">
            <span class="icon">⏰</span>
            <span class="name">{alertItem.name}</span>
            <span class="time">{formatTimeStr(alertItem.time, $timeFormat)}</span>
            <span class="badge" style="background: #f59e0b;">{getDayMaskLabel(alertItem.daysMask)}</span>
            <span class="badge" style="background: #8b5cf6;">Grace: {alertItem.gracePeriod}m</span>
            <button class="edit-btn" on:click={() => startEditAlert(alertItem)}>
              Edit
            </button>
            <button class="delete-btn" on:click={() => deleteAlert(alertItem.id)}>
              Delete
            </button>
          </div>
        {/each}
      </div>

      {#if alerts.length === 0}
        <p class="empty-message">No alerts yet. Create one above to get started.</p>
      {/if}
    </div>

    <!-- Edit Alert Modal -->
    {#if editingAlert}
      <div class="modal-overlay" on:click={cancelEditAlert}>
        <div class="modal" on:click|stopPropagation>
          <h2>Edit Alert</h2>

          <div class="form">
            <div class="form-row">
              <input
                type="text"
                bind:value={editingAlert.name}
                placeholder="Alert name"
                class="input-field"
              />
            </div>
            <div class="form-row">
              <label>
                Time:
                <input type="time" bind:value={editingAlert.time} class="input-field" />
              </label>
              <label>
                Grace Period:
                <input type="number" bind:value={editingAlert.gracePeriod} min="0" max="60" class="input-field" />
                <span class="unit">minutes</span>
              </label>
            </div>
            <div class="form-row">
              <label>Days:</label>
              <div class="days-controls">
                <div class="preset-buttons">
                  <button type="button" class="preset-btn" on:click={() => setEditAlertDayPreset('all')}>
                    All Days
                  </button>
                  <button type="button" class="preset-btn" on:click={() => setEditAlertDayPreset('weekdays')}>
                    Weekdays
                  </button>
                  <button type="button" class="preset-btn" on:click={() => setEditAlertDayPreset('weekend')}>
                    Weekend
                  </button>
                </div>
                <div class="days-selector">
                  {#each dayNames as day, i}
                    <button
                      type="button"
                      class="day-btn"
                      class:selected={(editAlertKey & (1 << i)) !== 0}
                      on:click={() => toggleEditAlertDay(i)}
                    >
                      {day}
                    </button>
                  {/each}
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="cancel-btn" on:click={cancelEditAlert}>
                Cancel
              </button>
              <button type="button" class="save-btn" on:click={saveEditAlert}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {:else if activeTab === 'settings'}
    <div class="section">
      <h2>Display Settings</h2>
      
      <div class="setting-group">
        <div class="setting-item">
          <div class="setting-info">
            <label for="dimTimeout">Dim Mode Timeout</label>
            <p class="description">Minutes to disable dim mode after clicking or interacting with the dashboard</p>
          </div>
          <div class="setting-control">
            <input
              id="dimTimeout"
              type="number"
              bind:value={dimTimeout}
              min="1"
              max="120"
              on:change={() => saveSetting('dimTimeout', dimTimeout)}
            />
            <span class="unit">minutes</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="nightStart">Night Mode Start</label>
            <p class="description">Time when dim mode automatically activates</p>
          </div>
          <div class="setting-control">
            <input
              id="nightStart"
              type="time"
              bind:value={nightModeStart}
              on:change={() => saveSetting('nightMode.start', nightModeStart)}
            />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="nightEnd">Night Mode End</label>
            <p class="description">Time when dim mode automatically deactivates</p>
          </div>
          <div class="setting-control">
            <input
              id="nightEnd"
              type="time"
              bind:value={nightModeEnd}
              on:change={() => saveSetting('nightMode.end', nightModeEnd)}
            />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="timeFormat">Time Format</label>
            <p class="description">Display time in 12-hour or 24-hour format</p>
          </div>
          <div class="setting-control">
            <select id="timeFormat" bind:value={$timeFormat}>
              <option value="12">12-hour (1:30 PM)</option>
              <option value="24">24-hour (13:30)</option>
            </select>
          </div>
        </div>
      </div>

      <h2 style="margin-top: 3rem;">Keyboard Shortcuts</h2>
      
      <div class="setting-group">
        <div class="shortcuts-info">
          <p class="description" style="margin-bottom: 1rem;">Use keyboard shortcuts to quickly control your dashboard without clicking.</p>
          
          <div class="shortcut-list">
            <div class="shortcut-item">
              <div class="shortcut-key">1-9</div>
              <div class="shortcut-description">
                <strong>Toggle Habits</strong>
                <p>Press number keys 1-9 to toggle the corresponding habit for today. Key 1 affects the first habit, key 2 the second, etc. Works the same as clicking - cycles through completion states.</p>
              </div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-key">Space</div>
              <div class="shortcut-description">
                <strong>Dismiss Alert</strong>
                <p>Press Space to dismiss the current alert notification. Same as clicking the Dismiss button.</p>
              </div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-key">D</div>
              <div class="shortcut-description">
                <strong>Toggle Dim Mode</strong>
                <p>Press 'D' to temporarily disable or re-enable dim mode. Auto-dim schedule will still be respected - dim mode will automatically re-enable at the scheduled night mode start time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 style="margin-top: 3rem;">Backup & Restore</h2>
      
      <div class="setting-group">
        <div class="backup-section">
          <div class="backup-info">
            <h3>Export Data</h3>
            <p class="description">Download a backup of all your habits, schedule, alerts, and settings. Keep this file safe for data recovery.</p>
          </div>
          <button class="backup-btn export-btn" on:click={exportBackup}>
            📥 Export Backup
          </button>
        </div>

        <div class="backup-section">
          <div class="backup-info">
            <h3>Import Data</h3>
            <p class="description">Restore data from a previous backup. This will replace all current data.</p>
          </div>
          <label class="backup-btn import-btn">
            📤 Import Backup
            <input
              type="file"
              accept=".json"
              on:change={importBackup}
              style="display: none;"
            />
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .settings-page {
    min-height: 100vh;
    max-height: 100vh;
    overflow-y: auto;
    padding: 2rem;
    background: var(--bg-primary);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
  }

  .back-btn {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: var(--bg-secondary);
  }

  .tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .tab {
    background: none;
    border: none;
    padding: 1rem 2rem;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 600;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.active {
    color: var(--accent-blue);
    border-bottom-color: var(--accent-blue);
  }

  .section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.75rem;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--accent-primary);
    padding-bottom: 0.75rem;
    border-bottom: 2px solid rgba(103, 254, 153, 0.2);
  }

  h3.section-subtitle {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-top: 2rem;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.85rem;
  }

  h3.section-subtitle:first-of-type {
    margin-top: 0;
  }

  .empty-message {
    text-align: center;
    padding: 3rem;
    color: var(--text-tertiary);
    font-size: 0.95rem;
  }

  .form {
    margin-bottom: 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    display: block;
  }

  .help-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: -0.5rem 0 1rem 0;
  }

  .input-field {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 2px solid rgba(255, 255, 255, 0.15) !important;
    padding: 0.85rem 1rem !important;
    border-radius: 8px !important;
    color: var(--text-primary) !important;
    font-size: 1rem !important;
    transition: all 0.2s;
  }

  .input-field:focus {
    outline: none;
    border-color: var(--accent-primary) !important;
    background: rgba(255, 255, 255, 0.1) !important;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.25rem;
    align-items: flex-start;
  }

  .form-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }

  input, select {
    flex: 1;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid rgba(255, 255, 255, 0.15);
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
  }

  input:focus, select:focus {
    outline: none;
    border-color: var(--accent-primary);
    background: rgba(255, 255, 255, 0.12);
  }

  .color-picker-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .color-preview {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .color-input {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    background: none;
  }

  .color-input::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color-input::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }

  input[type="color"] {
    flex: 0;
    width: 60px;
    height: 45px;
    cursor: pointer;
  }

  input[type="number"] {
    flex: 0;
    width: 120px;
  }

  input[type="time"] {
    flex: 0;
    width: 150px;
  }

  button[type="submit"] {
    background: var(--accent-blue);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  button[type="submit"]:hover {
    background: #2563eb;
  }

  .save-btn-form {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(34, 197, 94, 0.2));
    border: 2px solid rgba(34, 197, 94, 0.6);
    color: #22c55e;
    padding: 0.85rem 2rem;
    border-radius: 0.75rem;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
  }

  .save-btn-form:hover {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(34, 197, 94, 0.3));
    border-color: rgba(34, 197, 94, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.3);
  }

  .save-btn-form:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
  }

  .btn-icon {
    font-size: 1.1rem;
    font-weight: 900;
  }

  .days-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .preset-btn {
    background: rgba(59, 130, 246, 0.15);
    border: 2px solid rgba(59, 130, 246, 0.4);
    padding: 0.6rem 1.2rem;
    border-radius: 0.5rem;
    color: #67fe99;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.15s;
    position: relative;
  }

  .preset-btn:hover {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.6);
    transform: translateY(-1px);
  }

  .preset-btn:active {
    transform: translateY(0) scale(0.95);
    background: rgba(59, 130, 246, 0.4);
    border-color: rgba(59, 130, 246, 0.8);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .days-selector {
    display: flex;
    gap: 0.5rem;
  }

  /* Schedule Preview Timeline */
  .schedule-preview {
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
  }

  .schedule-preview > label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .preview-legend {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .legend-color {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .legend-color.available {
    background: rgba(34, 197, 94, 0.6);
    border: 1px solid rgba(34, 197, 94, 0.8);
  }

  .legend-color.scheduled {
    background: rgba(239, 68, 68, 0.6);
    border: 1px solid rgba(239, 68, 68, 0.8);
  }

  .legend-color.new-block {
    background: rgba(59, 130, 246, 0.6);
    border: 1px solid rgba(59, 130, 246, 0.8);
  }

  .preview-row {
    margin-bottom: 0.75rem;
  }

  .preview-row-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 0.35rem;
  }

  .preview-timeline {
    display: flex;
    height: 32px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .preview-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    border-right: 1px solid rgba(0, 0, 0, 0.4);
    transition: all 0.2s;
    overflow: hidden;
  }

  .preview-slot:last-child {
    border-right: none;
  }

  .preview-slot.available {
    background: rgba(34, 197, 94, 0.3);
    border-right: 1px solid rgba(34, 197, 94, 0.5);
  }

  .preview-slot.scheduled {
    background: rgba(239, 68, 68, 0.4);
    border-right: 1px solid rgba(239, 68, 68, 0.5);
  }

  .preview-slot.new-block {
    background: rgba(59, 130, 246, 0.5);
    border-right: 1px solid rgba(59, 130, 246, 0.7);
    box-shadow: inset 0 0 8px rgba(59, 130, 246, 0.4);
  }

  .slot-icon {
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .slot-label {
    font-size: 0.55rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 2px;
    font-family: 'JetBrains Mono', monospace;
  }

  .preview-times {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.6rem;
    color: var(--text-tertiary);
    font-family: 'JetBrains Mono', monospace;
  }

  .day-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid rgba(255, 255, 255, 0.15);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .day-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .day-btn.selected {
    background: rgba(59, 130, 246, 0.4);
    border-color: #3b82f6;
    color: white;
    font-weight: 700;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.4),
                inset 0 1px 3px rgba(255, 255, 255, 0.2);
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .item.draggable {
    cursor: grab;
  }

  .item.draggable:active {
    cursor: grabbing;
  }

  .drag-handle {
    color: var(--text-tertiary);
    cursor: grab;
    font-size: 1.2rem;
    user-select: none;
  }

  .icon {
    font-size: 1.5rem;
  }

  .name {
    flex: 1;
    font-weight: 600;
  }

  .time {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.85);
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.2);
  }

  .edit-btn {
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .edit-btn:hover {
    background: rgba(59, 130, 246, 0.2);
  }

  .delete-btn {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    background: var(--surface);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    gap: 2rem;
  }

  .setting-info {
    flex: 1;
  }

  .setting-info label {
    display: block;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .description {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .setting-control input {
    width: 120px;
  }

  .backup-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    gap: 2rem;
  }

  .backup-info {
    flex: 1;
  }

  .backup-info h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .backup-btn {
    background: rgba(59, 130, 246, 0.15);
    border: 2px solid rgba(59, 130, 246, 0.4);
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    color: var(--accent-primary);
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .backup-btn:hover {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.6);
    transform: translateY(-1px);
  }

  .backup-btn:active {
    transform: translateY(0);
  }

  .export-btn {
    background: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
    color: #22c55e;
  }

  .export-btn:hover {
    background: rgba(34, 197, 94, 0.25);
    border-color: rgba(34, 197, 94, 0.6);
  }

  .import-btn {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
    color: #3b82f6;
  }

  .import-btn:hover {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.6);
  }

  .shortcuts-info {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .shortcut-item {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }

  .shortcut-key {
    background: linear-gradient(135deg, rgba(103, 254, 153, 0.2), rgba(59, 130, 246, 0.2));
    border: 2px solid rgba(103, 254, 153, 0.4);
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: var(--accent-primary);
    text-shadow: 0 0 10px rgba(103, 254, 153, 0.5);
    min-width: 60px;
    text-align: center;
    flex-shrink: 0;
  }

  .shortcut-description {
    flex: 1;
  }

  .shortcut-description strong {
    display: block;
    font-size: 1rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .shortcut-description p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .unit {
    font-size: 0.9rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: var(--bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2.5rem;
    max-width: 700px;
    width: 95%;
    max-height: 85vh;
    overflow-y: auto;
  }

  .modal h2 {
    margin-bottom: 1.5rem;
  }

  .modal h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 1.5rem 0 1rem 0;
    color: var(--text-secondary);
  }

  .time-window {
    background: rgba(255, 255, 255, 0.04);
    padding: 1.25rem;
    border-radius: 10px;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .time-row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .time-row .form-group {
    flex: 0 0 auto;
  }

  .time-row .form-group:first-child {
    flex: 0 0 180px;
  }

  .time-row .form-group:nth-child(2) {
    flex: 1;
  }

  .remove-window-btn {
    background: transparent;
    color: #ef4444;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    margin-top: 1.8rem;
  }

  .remove-window-btn:hover {
    color: #dc2626;
  }

  .days-selector-compact {
    display: flex;
    gap: 0.25rem;
  }

  .day-btn-small {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.5rem;
    border-radius: 6px;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 0.8rem;
    min-width: 36px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .day-btn-small:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .day-btn-small.selected {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: white;
  }

  .add-window-btn {
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 0.5rem;
    width: 100%;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .save-btn {
    background: var(--accent-primary);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
</style>
