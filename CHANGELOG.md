# Changelog

All notable changes to LifeBoard will be documented in this file.

## [Unreleased] - 2026-02-21

### Added
- **Production Data Sync**:
  - Configure production server URL in settings
  - Manual sync button to import production data
  - Auto-sync option: imports data on first load each day
  - Tracks last sync date to prevent duplicate imports
  - Perfect for local development with real production data
- **Fullscreen Mode**:
  - Fullscreen button in header (next to settings)
  - Fullscreen button in mobile view mode controls
  - **F** key keyboard shortcut to toggle fullscreen
- **Auto-Hide Cursor**: Cursor automatically hides after 5 minutes of inactivity
- **Deployment Script**: Created `deploy.sh` for easy push to GitHub and Raspberry Pi
- **Clickable Shiba Tile**: Click anywhere on Shiba to regenerate image

### Improved
- **Dim Mode Enhancements**:
  - Clock doubled in size for better visibility during sleep
  - Clock now fills entire viewport and is centered
  - Removed all distractions: date, alerts, system info, settings
  - Ultra-dim outline-only text (transparent fill with subtle stroke)
  - Darker green color and minimal glow (won't disturb sleep)
  - Background opacity increased to 95-97% with 8px blur
  - Perfect for 24/7 bedroom display
- **Settings Panel**:
  - All accordion sections now start collapsed for cleaner view
  - Organized into 5 sections: Display, Tiles, AI, Shortcuts, Backup
- **Mobile View**:
  - Fixed habit order to match main dashboard (removed auto-sorting)
  - Habits display in same order as configured
- **Dashboard Layout**:
  - Tiles reorganized: Shiba (1/4) + Countdown (1/4) + Days Won (2/4)
  - Habit tracker now full width
  - Timeline section has extra margin for better spacing
- **Countdown Tile**:
  - Horizontal layout with large number and details on right
  - Number increased from 4rem to 7rem (75% larger)
  - Content centered horizontally
- **Days Won Tile**:
  - Content vertically centered
  - Individual metric visibility toggles (days won, win rate, streaks, periods)
- **Shiba Motivational Character**:
  - Added extensive debug logging
  - Keyboard support (Enter/Space) for regeneration
  - Force-regenerate clears cache properly

### Fixed
- **Overnight Schedule Countdown**: Fixed time remaining for blocks crossing midnight (e.g., 8pm-4am now shows full duration)
- **Dim Mode Clock Visibility**: Clock now renders above overlay (z-index fix)
- **Section Ordering**: Dashboard sections can be reordered in settings

### Technical
- Created `/api/backup/export` endpoint for production sync
- Production sync fetches from configured URL and imports data
- Cursor hide/show handlers with 5-minute timeout
- Z-index layering: dashboard < dim overlay (9999) < clock (10000)
- Overnight block calculation: adds 1440 minutes when end < start
- Deploy script with safety checks and SSH automation

---

## [Previous] - 2026-01-01

### Added
- **Time Format Settings**: Toggle between 12-hour and 24-hour time display
- **Alert System**: 
  - Create time-based alerts with day selection (weekdays/weekends/all days)
  - Configurable grace period (default 5 minutes before alert time)
  - Full-screen flashing overlay when alerts trigger
  - Persistent alert dismissal (dismissed alerts stay dismissed for the day)
  - Next alert display in header showing upcoming alerts
- **Backup & Restore**: 
  - Export full database to JSON
  - Import backup data
  - New backup tab in settings
- **Schedule Editing**: Edit existing schedule blocks with modal interface
- **Smart End Time Detection**: Automatically detects and sets end time based on next scheduled block
- **Keyboard Shortcuts**: 
  - Press **D** to toggle dim mode on/off
  - Keyboard shortcuts documentation in settings
  - Visual toast notifications for shortcut feedback

### Improved
- **Timeline**:
  - Real-time progress updates (updates every second instead of waiting for block changes)
  - Active block height increased for better visibility
  - Progress gradient now accurately represents completion percentage
  - Time labels repositioned to bottom corners of active block container
  - Improved block transition logic (switches immediately when next block starts)
  - Active block layout restructured for better spacing
- **Admin Panel UI**:
  - Better visual hierarchy with improved section backgrounds
  - H2 headers highlighted with accent color
  - Input fields with improved styling and focus states
  - Uniform button styling with green save buttons
  - Day/preset buttons now show selected state correctly (forced reactivity)
  - Item cards with hover states
  - Edit buttons added to all schedule blocks
- **Night Mode / Dim Mode**:
  - Manual enable/disable function added
  - Improved keyboard shortcut integration
  - Better interaction handling (D key ignored by auto-disable)
  - Separated manual dim from scheduled night mode (new `manuallyEnabled` state)
  - Timeout only triggers during scheduled night hours, not manual dim
  - Auto-disable on interaction only during scheduled hours
- **Mobile View**:
  - Improved habit click reactivity with immediate visual feedback
  - Disabled habit re-sorting when items are checked (prevents mis-clicks)
  - Dim toggle now works correctly with stopPropagation

### Fixed
- Alert dismissal persistence (now uses localStorage to track dismissed alerts per day)
- Day/preset button state display in schedule and alerts forms
- Block transition timing (no more showing "End/0%" state between consecutive blocks)
- CSS syntax error in admin panel style tag
- SSR window access error in keyboard event handler
- Progress gradient visibility improved with sharper cutoff
- Time label positioning in active block

### Technical
- Night mode state now has `manuallyEnabled` separate from `serverEnabled`
- Added `manuallyEnableDim()` function to nightmode store
- `temporarilyDisableDim()` handles manual vs scheduled mode differently
- Mobile habit entries use immutable updates for proper Svelte reactivity
- Created `/api/backup/export` and `/api/backup/import` endpoints
- Created `/api/alerts` endpoints (GET, POST, DELETE)
- Added PATCH endpoint for schedule blocks (`/api/schedule/:id`)
- Improved reactive state handling in admin forms
- Added toast notification system for keyboard shortcuts
- Event capture phase handling for keyboard shortcuts

## Earlier Versions
See git history for previous changes.
