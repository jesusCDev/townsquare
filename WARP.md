# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

LifeBoard is a real-time personal productivity dashboard built for Raspberry Pi 5 with TV display. It's a monorepo using pnpm workspaces with a Fastify backend and SvelteKit frontend.

**Key capabilities**: Habit tracking with GitHub-style visualization, day timeline with real-time progress, time-based alerts, automatic night mode, and WebSocket real-time sync.

## Common Commands

### Development
```bash
# Start both frontend and backend
pnpm dev

# Start backend only (port 3000)
pnpm --filter @lifeboard/server dev

# Start frontend only (port 5173)
pnpm --filter @lifeboard/web dev

# Quick start with all checks
./start.sh
```

### Database Operations
```bash
# Generate migration after schema changes
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with initial data
pnpm db:seed

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Code Quality
```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check

# Build for production
pnpm build
```

### Installation & Setup
```bash
# First-time setup (installs Node.js, pnpm, dependencies, sets up DB)
./install.sh

# Manual setup
pnpm install
cp .env.example .env
# Edit .env with your configuration
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Architecture

### Monorepo Structure
```
apps/
├── server/          # Fastify backend (Node.js 20, TypeScript)
│   ├── src/
│   │   ├── routes/  # API endpoints (/api/*)
│   │   ├── db/      # Drizzle ORM schema, migrations, seed
│   │   ├── jobs/    # node-cron scheduled tasks
│   │   ├── websocket/ # Socket.IO setup
│   │   └── lib/     # Shared utilities, Pino logger
│   └── data/        # SQLite database file location
│
└── web/             # SvelteKit frontend (Svelte 4, Tailwind CSS)
    ├── src/
    │   ├── routes/  # Pages (+page.svelte)
    │   │   ├── admin/  # Settings/config UI
    │   │   └── mobile/ # Mobile-specific views
    │   └── lib/
    │       ├── components/ # UI components (.svelte)
    │       └── stores/     # Svelte stores for state
```

### Backend Architecture

**Entry Point**: `apps/server/src/index.ts` → `buildApp()` → `registerRoutes()` + `setupWebSocket()` + `initializeJobs()`

**API Routes** (all under `/api/`):
- `habits.ts` - CRUD operations, complete/delete entries
- `schedule.ts` - Schedule blocks, current/next activity
- `alerts.ts` - Reminders/alerts management
- `settings.ts` - Key-value settings storage
- `backup.ts` - File upload/download backup system
- `countdowns.ts` - Countdown timers
- `stats.ts` - Statistics and analytics
- `health.ts` - Health check endpoint

**Database**: SQLite with Drizzle ORM
- Schema: `apps/server/src/db/schema.ts`
- Main tables: `habits`, `habitEntries`, `scheduleBlocks`, `reminders`, `settings`, `countdowns`
- Drizzle config: `apps/server/drizzle.config.ts`
- Migrations: Auto-generated in `apps/server/drizzle/`

**Real-time Communication**: Socket.IO
- Setup: `apps/server/src/websocket/index.ts`
- Events emitted: `habit:created`, `habit:updated`, `habit:deleted`, `schedule:updated`, `nightmode:toggle`
- The `io` instance is decorated on Fastify app and accessible in routes

**Scheduled Jobs** (`apps/server/src/jobs/`):
- `night-mode.ts` - Auto-enable/disable dim mode based on time
- `auto-backup.ts` - Periodic database backups

### Frontend Architecture

**State Management**: Svelte stores in `apps/web/src/lib/stores/`
- `socket.ts` - Socket.IO connection and reconnect logic
- `habits.ts` - Habits list and entries
- `schedule.ts` - Schedule blocks
- `nightmode.ts` - Night mode state with manual/auto toggle
- `timeFormat.ts` - 12/24 hour preference
- `alertActions.ts` - Alert dismissal actions

**Key Components** (`apps/web/src/lib/components/`):
- `Clock.svelte` - Digital clock with date
- `HabitTracker.svelte` - GitHub-style contribution heatmap
- `Timeline.svelte` - Day timeline with current activity
- `AlertNotification.svelte` - Full-screen alert overlay
- `CountdownTile.svelte` - Countdown display
- `DaysWonTile.svelte` - Days won statistics
- `SystemHealth.svelte` - Memory, uptime display
- `Header.svelte` - Top navigation with clock

**Main Dashboard**: `apps/web/src/routes/+page.svelte`
- Keyboard shortcuts: Space (dismiss alert), 1-9 (toggle habits), D (toggle dim mode)
- Layout: Header → Habits → Timeline → Info Tiles → Alert Overlay

### Configuration

**Environment Variables** (`.env`):
- `NODE_ENV` - development/production
- `PORT` - Backend port (default: 3000)
- `DATABASE_PATH` - SQLite file path (default: ./data/lifeboard.db)
- `STATIC_DIR` - Frontend build output (default: ./static)
- `API_KEY` - API authentication (not enforced in dev)
- `CORS_ORIGIN` - Allowed origins
- `NIGHT_MODE_START/END/BRIGHTNESS` - Auto-dim settings
- `WHOOP_CLIENT_ID/SECRET/REDIRECT_URI` - Optional Whoop integration

**Config Loading**: `apps/server/src/config.ts` uses Zod validation

### Database Schema Patterns

**Days Mask**: Integer bitmask for day selection (0-127)
- Bit 0 = Monday, Bit 6 = Sunday
- 127 = all days, 31 = weekdays (Mon-Fri), 96 = weekends (Sat-Sun)

**Habits**:
- `targetCount` - Completions per day
- `timedWindows` - JSON string of time ranges when habit is available
- `position` - Display order (drag-and-drop reordering)

**Schedule Blocks**:
- `startTime` - HH:MM format
- `endTime` - Optional (auto-fills to next block's start)
- `daysMask` - Which days this block applies

**Reminders**:
- `warnMinutes` - Grace period before alert time
- `mode` - overlay/banner/takeover
- `source` - manual/calendar/external

### Testing & Development

**No test suite currently exists.** To validate changes:
1. Build backend: `pnpm --filter @lifeboard/server build`
2. Check TypeScript: `pnpm type-check`
3. Manual testing: Start dev servers and test in browser

**Port Management**:
- Backend: 3000
- Frontend: 5173
- If ports are in use, `./start.sh` will prompt to kill processes

### Deployment

**Raspberry Pi**: Use `./install.sh` for initial setup, then `./start.sh` to run

**Production**:
- Build: `pnpm build` (compiles server to `dist/`, builds web to `.svelte-kit/`)
- Run: `pnpm start` (runs `node apps/server/dist/index.js`)
- In production, backend serves frontend static files from `STATIC_DIR`

**Docker**: Docker Compose files mentioned in package.json but not present in repo

### Real-time Data Flow

1. User action (e.g., complete habit) → POST to `/api/habits/:id/complete`
2. Route handler updates database → emits Socket.IO event (`habit:updated`)
3. All connected clients receive event → update Svelte store → reactive UI update

### Key Design Patterns

**Monorepo with Turbo**: `turbo.json` defines pipeline for `dev`, `build`, `lint`, `type-check`

**Type Safety**: TypeScript throughout, Zod for runtime validation at API boundaries

**Logging**: Pino logger with separate loggers for API, WebSocket, and general app logs

**Database Migrations**: 
1. Edit `schema.ts`
2. Run `pnpm db:generate` (creates migration file)
3. Run `pnpm db:migrate` (applies migration)

**Settings Storage**: Key-value pairs in `settings` table, accessed via `/api/settings`

### Important Notes

- The app is designed for single-user, local network use (Raspberry Pi on home network)
- WebSocket connection is critical - stores handle reconnection automatically
- Night mode has both automatic (scheduled) and manual toggle capabilities
- Habit entries use date strings in `YYYY-MM-DD` format (not timestamps)
- Schedule blocks auto-fill end times to prevent gaps
