# LifeBoard Quick Start Guide

## ✅ Application Status
Your LifeBoard application has been successfully created and tested!

## 🚀 Running the Application

### Development Mode (Both Frontend & Backend)
```bash
cd /home/average_l/Programming/TownSquare
pnpm dev
```

This starts:
- **Backend API** on `http://localhost:3000`
- **Frontend** on `http://localhost:5173`

Open your browser to `http://localhost:5173` to view the dashboard.

### Backend Only
```bash
cd apps/server
pnpm dev
```

### Frontend Only
```bash
cd apps/web
pnpm dev
```

## 📦 What's Been Built

### ✅ Completed Features
1. **Monorepo structure** with pnpm workspaces
2. **Backend (Fastify + SQLite + Drizzle ORM)**
   - RESTful API endpoints for habits, schedule, and settings
   - WebSocket real-time communication
   - Job scheduler for night mode and reminders
   - Structured logging with Pino
   - SQLite database with migrations

3. **Frontend (SvelteKit + Tailwind CSS)**
   - **Clock component** with live time and date
   - **GitHub-style habit tracker** with 30-day heatmap visualization
     - Shows completion intensity with color coding
     - Displays current streak with fire emoji
     - Today's date highlighted
     - Quick completion buttons
   - **Dynamic timeline** with real-time progress bar
     - Moving time indicator
     - Visual schedule blocks with colors
     - Shows current activity and time remaining
     - Next activity preview
   - **Settings/Admin page** for managing habits and schedules
     - Add/delete habits with custom icons and colors
     - Create schedule blocks with time ranges
     - Day-of-week selector for schedules
   - **System health monitoring** footer
   - Real-time updates via Socket.IO
   - Full viewport height layout (no gaps)

4. **Database** 
   - Pre-seeded with 3 default habits (Workout, Brush Teeth AM/PM)
   - 6 schedule blocks for weekdays and weekends
   - Settings configuration

## 🧪 Testing the API

With the server running (port 3000), test these endpoints:

```bash
# Health check
curl http://localhost:3000/api/health

# Get all habits
curl http://localhost:3000/api/habits

# Get schedule
curl http://localhost:3000/api/schedule

# Get current schedule block
curl http://localhost:3000/api/schedule/current

# Complete a habit (replace HABIT_ID with actual ID from /api/habits)
curl -X POST http://localhost:3000/api/habits/HABIT_ID/complete \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📱 Android Integration

Your Android apps can complete habits by POSTing to:
```
POST http://your-pi-ip:3000/api/habits/:habitId/complete
Content-Type: application/json

{
  "date": "2025-12-29",  // optional, defaults to today
  "timestamp": "2025-12-29T12:00:00Z"  // optional, defaults to now
}
```

The dashboard will update in real-time via WebSocket!

## 🏗️ Project Structure

```
TownSquare/
├── apps/
│   ├── server/          # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/  # API endpoints
│   │   │   ├── db/      # Database & migrations
│   │   │   ├── jobs/    # Scheduled tasks
│   │   │   └── websocket/ # Socket.IO
│   │   └── data/        # SQLite database
│   │
│   └── web/             # SvelteKit frontend
│       ├── src/
│       │   ├── routes/  # Pages
│       │   ├── lib/
│       │   │   ├── components/  # UI components
│       │   │   └── stores/      # State management
│       │   └── app.css
│       └── build/       # Production build
│
├── data/                # SQLite DB & logs
├── .env                 # Environment config
└── package.json         # Root workspace
```

## 🔧 Database Commands

```bash
# Generate new migration after schema changes
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with initial data
pnpm db:seed

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## 🌙 Features Overview

### Night Mode
Automatically dims the dashboard between 8 PM - 6 AM (configurable in `.env`):
- `NIGHT_MODE_START=20:00`
- `NIGHT_MODE_END=06:00`
- `NIGHT_MODE_BRIGHTNESS=0.55`

### Real-time Updates
WebSocket events keep the dashboard synchronized:
- `habit:created` - New habit added
- `habit:updated` - Habit completed
- `habit:deleted` - Habit removed
- `schedule:updated` - Schedule modified
- `nightmode:toggle` - Night mode state changed

### System Health
Footer shows:
- WebSocket connection status
- Memory usage
- Server uptime
- Platform info

## 🎯 Next Steps

1. **Customize Your Habits**
   - Edit `apps/server/src/db/seed.ts` to add your habits
   - Run `pnpm db:seed` to reload

2. **Customize Your Schedule**
   - Edit schedule blocks in the seed file
   - Or use the API to add/modify blocks

3. **Deploy to Raspberry Pi**
   - Follow the deployment guide in `README.md`
   - Use the scripts in `scripts/` directory

4. **Add More Features**
   - Whoop integration (requires API credentials)
   - Reminder system (already scaffolded)
   - Backup system (endpoints ready)

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database locked
```bash
# Stop any running instances
pkill -f tsx

# Restart dev servers
pnpm dev
```

### Clear and rebuild
```bash
# Clean everything
pnpm clean

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

## 📚 Technology Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript
- **Backend**: Fastify + Socket.IO
- **Database**: SQLite + Drizzle ORM
- **Frontend**: SvelteKit + Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Monorepo**: Turborepo

---

**Your dashboard is ready to use! 🎉**

Open `http://localhost:5173` in your browser and start tracking your habits!
