# Changelog

All notable changes to LifeBoard will be documented in this file.

## [Unreleased] - 2026-01-01

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
