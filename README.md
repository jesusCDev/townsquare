# LifeBoard

A real-time personal productivity dashboard designed to run on a Raspberry Pi 5 and display on a TV.

## Features

### Dashboard
- **Digital Clock** - 12/24 hour format with date display
- **System Health** - Memory usage and uptime monitoring
- **Next Alert Display** - Shows upcoming alerts in the header

### Habit Tracking
- **Habit Tracker** - GitHub-style contribution visualization with streaks
- **Drag-and-Drop Reordering** - Customize habit order
- **Timed Windows** - Set specific time ranges when habits are available
- **Target Counts** - Track multiple completions per day

### Schedule & Timeline
- **Day Timeline** - Visual progress bar showing current activity with real-time updates
- **Dynamic Active Block** - Current activity enlarged with progress percentage and time remaining
- **Smart End Time Detection** - Automatically fills gaps between schedule blocks
- **Overlap Prevention** - Validates schedule entries to prevent conflicts
- **Urgency Indicator** - Red glow when less than 5 minutes remaining

### Alerts & Reminders
- **Time-Based Alerts** - Set alerts with day selection (weekdays/weekends/all days)
- **Grace Period** - Configurable alert trigger window (default 5 minutes)
- **Full-Screen Overlay** - Prominent flashing alert display with dismiss option
- **Persistent Dismissal** - Dismissed alerts stay dismissed for the day

### Night Mode & Display
- **Automatic Dimming** - Scheduled night mode with configurable times
- **Manual Toggle** - Press **D** to instantly enable/disable dim mode
- **Temporary Disable** - Click or interact to disable dim temporarily
- **Auto-Restore** - Dim mode automatically restores at scheduled times

### Backup & Data Management
- **Export/Import** - Full database backup to JSON
- **Schedule Editing** - Edit existing schedule blocks
- **Settings Panel** - Comprehensive admin interface

### Keyboard Shortcuts
- **D Key** - Toggle dim mode on/off

## Tech Stack

- **Backend**: Node.js 20, Fastify, SQLite, Drizzle ORM, Socket.IO
- **Frontend**: SvelteKit, Tailwind CSS
- **Infrastructure**: Docker, PM2, Caddy

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
# Edit .env with your settings

# Generate database schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:5173
- API: http://localhost:3000

### Production (Docker)

```bash
# Build and start
pnpm docker:build
pnpm docker:up

# View logs
pnpm docker:logs
```

### Raspberry Pi Deployment

```bash
# First-time setup (installs Node.js, pnpm, dependencies, sets up database)
./install.sh

# Start the application
./start.sh

# Update to latest version (pulls changes, runs migrations, restarts)
./update.sh           # Production mode
./update.sh --dev     # Development mode
```

**What `update.sh` does:**
1. Stops existing application processes
2. Pulls latest changes from GitHub
3. Updates dependencies
4. Runs database migrations (adds new tables/columns)
5. Builds the application (production mode only)
6. Starts application in background

**View logs:** `tail -f logs/app.log`  
**Stop application:** `kill $(cat .app.pid)`

## Project Structure

```
lifeboard/
├── apps/
│   ├── server/        # Fastify backend
│   └── web/           # SvelteKit frontend
├── packages/
│   └── shared/        # Shared types and utilities
├── scripts/           # Deployment and setup scripts
├── docker/            # Docker configuration
└── data/              # SQLite database and backups
```

## License

MIT
