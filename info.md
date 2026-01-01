# Personal Dashboard Project Plan
## "LifeBoard" - A Real-Time Personal Productivity Dashboard

---

## 1. Project Overview

### Vision
A self-hosted, real-time dashboard running on a Raspberry Pi 5 that serves as a command center for daily productivity, habits, and health tracking. The dashboard displays on a TV and updates dynamically without page refreshes.

### Key Features
- **Digital Clock** - Always visible at the top
- **Habit Tracker** - GitHub-style contribution visualization with streaks
- **Day Timeline** - Visual progress bar showing current activity and time remaining
- **Whoop Integration** - Recovery, strain, and sleep metrics
- **Reminder System** - Full-screen alerts for upcoming events
- **Night Mode** - Automatic dimming between 8 PM - 6 AM
- **Backup System** - API endpoint for Android app backups

---

## 2. Technology Stack

### Backend
| Component | Technology | Reason |
|-----------|------------|--------|
| Runtime | **Node.js 20 LTS** | Excellent for real-time WebSocket apps, runs well on Pi |
| Framework | **Fastify** | Faster than Express, low overhead on Pi |
| Real-time | **Socket.IO** | Bi-directional updates, reconnection handling |
| Database | **SQLite** | Zero-config, file-based, perfect for single-user |
| ORM | **Drizzle ORM** | Type-safe, lightweight, SQLite-optimized |
| Scheduler | **node-cron** | For reminder checks and scheduled tasks |

### Frontend
| Component | Technology | Reason |
|-----------|------------|--------|
| Framework | **SvelteKit** | Lightweight, reactive, excellent performance |
| Styling | **Tailwind CSS** | Rapid dark-mode styling |
| Charts | **Chart.js** or **uPlot** | Lightweight visualization |
| Icons | **Lucide Icons** | Clean, consistent iconography |

### Infrastructure
| Component | Technology | Reason |
|-----------|------------|--------|
| Process Manager | **PM2** | Auto-restart, logs, startup scripts |
| Reverse Proxy | **Caddy** | Auto-HTTPS, simple config |
| OS | **Raspberry Pi OS Lite (64-bit)** | Minimal overhead |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TV DISPLAY                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     DIGITAL CLOCK                        │   │
│  │                      12:45 PM                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    HABIT TRACKER                         │   │
│  │  Habit      │ ▪▪▫▪▪▪▪▫▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪ │ 🔥 14 │ │
│  │  Workout    │ ▪▪▪▪▪▫▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▫▪▪▪▪▪▪▪ │ 🔥 28 │ │
│  │  Teeth AM   │ ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪ │ 🔥 30 │ │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DAY TIMELINE                          │   │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │  Work      │ Workout │ Lunch │ Work        │ Side Proj  │   │
│  │  7am       │ 10:30am │12:30pm│ 1pm         │ 5pm        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

         ▲ WebSocket (real-time updates)
         │
┌────────┴────────┐
│   BACKEND API   │
│   (Fastify +    │
│   Socket.IO)    │
├─────────────────┤
│ /api/habits     │◄──── Android Apps (HTTP POST)
│ /api/schedule   │
│ /api/reminders  │
│ /api/whoop      │◄──── Whoop Webhooks
│ /api/backup     │◄──── Android Backup Push
│ /ws             │
└────────┬────────┘
         │
    ┌────┴────┐
    │ SQLite  │
    │   DB    │
    └─────────┘
```

---

## 4. Feature Specifications

### 4.1 Digital Clock
- Large, readable font (min 120px)
- Shows time in 12h or 24h format (configurable)
- Date display below (e.g., "Sunday, December 28, 2025")
- Dims opacity during night mode

### 4.2 Habit Tracker

#### Visual Design
```
┌──────────────────────────────────────────────────────────────────────┐
│ HABIT         │ ← 30 days continuous →                │ NOW │ BEST  │
├──────────────────────────────────────────────────────────────────────┤
│ Workout       │ ▓▓▒▓▓▓▓▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │ 14  │  28   │
│ Brush AM      │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │ 30  │  45   │
│ Brush PM      │ ▓▓▓▓▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │ 25  │  25   │
│ Side Project  │ ▒▒▓▓▓▓▓▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │ 20  │  20   │
└──────────────────────────────────────────────────────────────────────┘

Legend: ▓ = completed, ▒ = partial/multi-occurrence, ░ = missed, · = future
```

#### Features
- **GitHub-style shading**: Intensity based on completion count
  - Single-occurrence habits: complete/incomplete
  - Multi-occurrence habits (e.g., brush teeth): shade by count (1x = light, 2x = full)
- **Continuous scrolling days**: No calendar gaps, days flow left-to-right
- **Current streak**: Shown on right with 🔥 emoji
- **Longest streak**: Shown next to current streak
- **Growing habit indicator**: Uncompleted habits with timestamps grow larger until done
- **Real-time updates**: Via WebSocket when Android apps POST updates

#### Data Model
```typescript
interface Habit {
  id: string;
  name: string;
  icon?: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  targetCount: number;  // 1 for single, 2+ for multi-occurrence
  reminderTime?: string; // HH:MM format
  createdAt: Date;
}

interface HabitEntry {
  id: string;
  habitId: string;
  date: string;  // YYYY-MM-DD
  count: number;
  completedAt: Date[];  // Array of timestamps for each completion
}
```

### 4.3 Day Timeline

#### Visual Design
```
┌────────────────────────────────────────────────────────────────────┐
│ ██████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ├── Work ──────────┤ Workout │Lunch│──── Work ────────│ Side Proj │
│ 7am               10:30    12:30 1pm                 5pm          │
│                                                                    │
│         CURRENT: Work · 2h 15m remaining                          │
└────────────────────────────────────────────────────────────────────┘
```

#### Features
- **Visual progress bar**: Filled portion shows elapsed time
- **Color-coded blocks**: Different colors for each activity type
- **Current activity highlight**: Pulsing border or glow effect
- **Time remaining display**: Countdown to next activity
- **Weekday/Weekend schedules**: Automatic switching based on day

#### Schedule Configuration
```typescript
interface ScheduleBlock {
  id: string;
  name: string;
  color: string;  // Hex color
  icon?: string;
  startTime: string;  // HH:MM
  endTime?: string;   // HH:MM (null = open-ended)
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
}
```

### 4.4 Reminder System

#### Alert Behavior
1. **Warning time**: Configurable minutes before event (default: 3 min)
2. **Visual takeover**: Full-screen red flashing overlay
3. **Display**: Event name, time until start, countdown
4. **Auto-dismiss**: When event time arrives
5. **Manual dismiss**: Click/tap to dismiss early

#### Alert UI
```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                         ⚠️ UPCOMING                                │
│                                                                    │
│                      DAILY STANDUP                                 │
│                                                                    │
│                    STARTS IN 2:45                                  │
│                                                                    │
│                   [Dismiss] [Snooze 1m]                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
(Background flashes between #1a1a1a and #3d0000)
```

### 4.5 Whoop Integration Widget

#### Available Data Points (from Whoop API v2)
- **Recovery Score**: 0-100% with color coding (green/yellow/red)
- **Strain Score**: 0-21 scale
- **Sleep Performance**: Hours slept, efficiency %, sleep stages
- **HRV**: Heart rate variability (ms)
- **Resting Heart Rate**: BPM
- **Respiratory Rate**: Breaths per minute

#### Suggested Widget Layout
```
┌──────────────────────────────────────────────────────────────┐
│                        WHOOP                                 │
├──────────────────────────────────────────────────────────────┤
│   RECOVERY        STRAIN          SLEEP                     │
│   ┌────────┐     ┌────────┐      ┌────────┐                 │
│   │  78%   │     │  12.4  │      │ 7h 23m │                 │
│   │ 🟢     │     │ ████░░ │      │  85%   │                 │
│   └────────┘     └────────┘      └────────┘                 │
│                                                              │
│   HRV: 45ms   RHR: 52bpm   Resp: 14.2/min                  │
└──────────────────────────────────────────────────────────────┘
```

#### Implementation Notes
- OAuth 2.0 flow for initial authentication
- Store refresh token securely
- Use webhooks for real-time updates (Whoop supports this!)
- Refresh token hourly
- Cache data locally in case of API issues

### 4.6 Night Mode
- **Active hours**: 8:00 PM - 6:00 AM (configurable)
- **Effect**: Reduce overall brightness to ~30%
- **Implementation**: CSS filter or overlay with opacity
- **Transition**: Smooth fade over 30 seconds

### 4.7 Backup System

#### Endpoints
```
POST /api/backup/:appName
- Body: multipart/form-data with backup file
- Stores in ~/backups/{appName}/{timestamp}-backup.{ext}
- Keeps last 30 backups per app

GET /api/backup/:appName/latest
- Returns most recent backup file

GET /api/backup/:appName/list
- Returns list of available backups with timestamps

POST /api/backup/:appName/restore/:backupId
- Triggers restore (returns file for app to download)
```

---

## 5. API Endpoints

### Habits
```
GET    /api/habits                    # List all habits
POST   /api/habits                    # Create habit
GET    /api/habits/:id                # Get habit details
PUT    /api/habits/:id                # Update habit
DELETE /api/habits/:id                # Delete habit

POST   /api/habits/:id/complete       # Mark completion (from Android apps)
DELETE /api/habits/:id/complete/:date # Remove completion

GET    /api/habits/:id/streak         # Get streak info
GET    /api/habits/entries?days=30    # Get entries for visualization
```

### Schedule
```
GET    /api/schedule                  # Get all schedule blocks
POST   /api/schedule                  # Create block
PUT    /api/schedule/:id              # Update block
DELETE /api/schedule/:id              # Delete block
GET    /api/schedule/current          # Get current activity + time remaining
```

### Reminders
```
GET    /api/reminders                 # List all reminders
POST   /api/reminders                 # Create reminder
PUT    /api/reminders/:id             # Update reminder
DELETE /api/reminders/:id             # Delete reminder
POST   /api/reminders/:id/dismiss     # Dismiss active reminder
```

### Whoop
```
GET    /api/whoop/auth                # Start OAuth flow
GET    /api/whoop/callback            # OAuth callback
GET    /api/whoop/status              # Connection status
GET    /api/whoop/data                # Current recovery/strain/sleep
POST   /api/whoop/webhook             # Webhook receiver for updates
DELETE /api/whoop/disconnect          # Revoke access
```

### Backup
```
POST   /api/backup/:appName           # Upload backup
GET    /api/backup/:appName/latest    # Download latest
GET    /api/backup/:appName/list      # List backups
DELETE /api/backup/:appName/:id       # Delete specific backup
```

### WebSocket Events
```
Server → Client:
  habit:updated      # Habit completion changed
  schedule:updated   # Schedule modified
  reminder:trigger   # Time to show reminder
  reminder:dismiss   # Reminder should hide
  whoop:updated      # New Whoop data received
  nightmode:toggle   # Night mode state changed

Client → Server:
  reminder:dismiss   # User dismissed reminder
  reminder:snooze    # User snoozed reminder
```

---

## 6. Database Schema (SQLite)

```sql
-- Habits table
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  target_count INTEGER NOT NULL DEFAULT 1,
  reminder_time TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Habit entries (completions)
CREATE TABLE habit_entries (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  count INTEGER NOT NULL DEFAULT 1,
  completed_at TEXT NOT NULL,  -- JSON array of ISO timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, date)
);

-- Schedule blocks
CREATE TABLE schedule_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  start_time TEXT NOT NULL,  -- HH:MM
  end_time TEXT,             -- HH:MM (null = open-ended)
  days TEXT NOT NULL,        -- JSON array of day codes
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reminders
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  time TEXT NOT NULL,         -- HH:MM
  days TEXT NOT NULL,         -- JSON array of day codes
  warning_minutes INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Whoop credentials (encrypted)
CREATE TABLE whoop_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Single row
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  user_id TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Whoop cached data
CREATE TABLE whoop_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  recovery_score REAL,
  strain_score REAL,
  sleep_hours REAL,
  sleep_efficiency REAL,
  hrv INTEGER,
  rhr INTEGER,
  respiratory_rate REAL,
  data_date TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_habit_entries_date ON habit_entries(date);
CREATE INDEX idx_habit_entries_habit ON habit_entries(habit_id);
CREATE INDEX idx_schedule_days ON schedule_blocks(days);
```

---

## 7. Additional Widget Ideas

### 7.1 Weather Widget
```
┌────────────────────────┐
│  ☀️ 72°F  Sunny        │
│  H: 78° L: 65°         │
│  Feels like 74°        │
└────────────────────────┘
```
- Use OpenWeatherMap free tier (1000 calls/day)
- Update every 30 minutes

### 7.2 Focus Timer / Pomodoro
```
┌────────────────────────┐
│   🍅 FOCUS TIME        │
│      23:45             │
│   [Start] [Reset]      │
└────────────────────────┘
```
- Integrates with schedule (auto-start during work blocks)
- Plays sound notification when complete

### 7.3 Quote of the Day
```
┌─────────────────────────────────────────────────────────────┐
│ "The only way to do great work is to love what you do."    │
│                                    — Steve Jobs             │
└─────────────────────────────────────────────────────────────┘
```
- Rotate daily from curated list
- Option to add personal quotes

### 7.4 Today's Goals / Intentions
```
┌────────────────────────────────────────────┐
│ TODAY'S FOCUS                              │
│ ○ Ship feature X                           │
│ ○ 45-min workout                           │
│ ○ Call mom                                 │
└────────────────────────────────────────────┘
```
- Set via mobile or quick API
- Check off as completed

### 7.5 Spotify Now Playing
```
┌────────────────────────────────────────────┐
│ ♪ Now Playing                              │
│ Song Title - Artist Name                   │
│ ▓▓▓▓▓▓▓▓░░░░░░ 2:34 / 4:12                │
└────────────────────────────────────────────┘
```
- Requires Spotify API integration
- Shows only when music is playing

### 7.6 GitHub Contribution Graph
```
┌────────────────────────────────────────────┐
│ 🐙 GitHub                                  │
│ ▪▪▫▪▪▪▪▫▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪ 42 today   │
└────────────────────────────────────────────┘
```
- Show your actual contribution graph
- Update daily

### 7.7 System Health Monitor
```
┌────────────────────────────────────────────┐
│ 🖥️ Pi Status                               │
│ CPU: 23%  RAM: 1.2/8GB  Temp: 45°C        │
│ Uptime: 14 days                            │
└────────────────────────────────────────────┘
```
- Monitor the Raspberry Pi itself
- Alert if temperature too high

### 7.8 Countdown Timers
```
┌────────────────────────────────────────────┐
│ ⏱️ COUNTDOWNS                              │
│ Vacation: 23 days                          │
│ Project deadline: 5 days                   │
│ Birthday: 89 days                          │
└────────────────────────────────────────────┘
```
- Track important upcoming dates

---

## 8. Project Structure

```
lifeboard/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
├── .env                    # Local only, not committed
├── README.md
│
├── src/
│   ├── server/
│   │   ├── index.ts       # Fastify entry point
│   │   ├── socket.ts      # Socket.IO setup
│   │   ├── db/
│   │   │   ├── schema.ts  # Drizzle schema
│   │   │   ├── index.ts   # DB connection
│   │   │   └── seed.ts    # Initial data
│   │   ├── routes/
│   │   │   ├── habits.ts
│   │   │   ├── schedule.ts
│   │   │   ├── reminders.ts
│   │   │   ├── whoop.ts
│   │   │   └── backup.ts
│   │   ├── services/
│   │   │   ├── whoop.ts   # Whoop API client
│   │   │   ├── reminder.ts # Reminder scheduler
│   │   │   └── nightmode.ts
│   │   └── utils/
│   │       └── time.ts
│   │
│   └── client/            # SvelteKit app
│       ├── src/
│       │   ├── routes/
│       │   │   └── +page.svelte    # Main dashboard
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   │   ├── Clock.svelte
│       │   │   │   ├── HabitTracker.svelte
│       │   │   │   ├── Timeline.svelte
│       │   │   │   ├── WhoopWidget.svelte
│       │   │   │   ├── ReminderOverlay.svelte
│       │   │   │   └── NightModeOverlay.svelte
│       │   │   ├── stores/
│       │   │   │   ├── socket.ts
│       │   │   │   ├── habits.ts
│       │   │   │   └── schedule.ts
│       │   │   └── utils/
│       │   │       └── time.ts
│       │   ├── app.css
│       │   └── app.html
│       ├── static/
│       └── svelte.config.js
│
├── scripts/
│   ├── setup-pi.sh        # Raspberry Pi setup script
│   ├── deploy.sh          # Git pull + restart
│   └── backup-db.sh       # Database backup
│
└── data/
    ├── lifeboard.db       # SQLite database
    └── backups/           # App backup storage
```

---

## 9. Development Workflow

### Local Development (Fedora)
```bash
# Clone and setup
git clone git@github.com:username/lifeboard.git
cd lifeboard
npm install

# Create local .env
cp .env.example .env
# Edit .env with local settings

# Start development
npm run dev
# Opens at http://localhost:5173
```

### Deployment to Raspberry Pi
```bash
# SSH into Pi
ssh pi@raspberrypi.local

# First-time setup
./scripts/setup-pi.sh

# For updates
cd ~/lifeboard
git pull origin main
npm install
npm run build
pm2 restart lifeboard
```

### PM2 Commands
```bash
pm2 start ecosystem.config.js  # Start app
pm2 restart lifeboard          # Restart
pm2 logs lifeboard             # View logs
pm2 monit                      # Monitor
pm2 save                       # Save config
pm2 startup                    # Generate startup script
```

---

## 10. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)
- [ ] Project scaffolding (Fastify + SvelteKit)
- [ ] Database setup with Drizzle
- [ ] Basic API routes (CRUD for habits, schedule)
- [ ] WebSocket connection
- [ ] Digital clock component
- [ ] Basic layout grid

### Phase 2: Habit Tracker (Week 2-3)
- [ ] Habit CRUD UI
- [ ] GitHub-style visualization
- [ ] Streak calculation
- [ ] Real-time updates from API
- [ ] Growing habit indicator
- [ ] Android app webhook endpoint

### Phase 3: Timeline & Reminders (Week 3-4)
- [ ] Schedule block management
- [ ] Timeline visualization
- [ ] Progress bar animation
- [ ] Reminder system
- [ ] Full-screen alert overlay
- [ ] Night mode

### Phase 4: Whoop Integration (Week 4-5)
- [ ] OAuth 2.0 flow
- [ ] Token storage and refresh
- [ ] Webhook receiver
- [ ] Widget UI
- [ ] Error handling and fallbacks

### Phase 5: Backup System (Week 5)
- [ ] Backup upload endpoint
- [ ] File storage management
- [ ] Retention policy (30 backups)
- [ ] Download/restore endpoints

### Phase 6: Polish & Deploy (Week 6)
- [ ] Raspberry Pi setup script
- [ ] PM2 configuration
- [ ] Performance optimization
- [ ] Testing on actual TV
- [ ] Documentation
- [ ] Additional widgets (optional)

---

## 11. Configuration

### Environment Variables
```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Database
DATABASE_PATH=./data/lifeboard.db

# Whoop OAuth
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REDIRECT_URI=http://localhost:3000/api/whoop/callback

# Optional integrations
OPENWEATHER_API_KEY=your_key
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret

# App settings
NIGHT_MODE_START=20:00
NIGHT_MODE_END=06:00
NIGHT_MODE_OPACITY=0.3
DEFAULT_REMINDER_WARNING=3
```

### Default Schedule (Editable via UI)
```json
{
  "weekday": [
    { "name": "Work", "start": "07:00", "end": "10:30", "color": "#3b82f6" },
    { "name": "Workout", "start": "10:30", "end": "12:30", "color": "#22c55e" },
    { "name": "Lunch", "start": "12:30", "end": "13:00", "color": "#f59e0b" },
    { "name": "Work", "start": "13:00", "end": "17:00", "color": "#3b82f6" },
    { "name": "Side Project", "start": "17:00", "end": null, "color": "#8b5cf6" }
  ],
  "weekend": [
    { "name": "Side Project", "start": "08:00", "end": "10:30", "color": "#8b5cf6" },
    { "name": "Workout", "start": "10:30", "end": "12:30", "color": "#22c55e" },
    { "name": "Lunch", "start": "12:30", "end": "13:00", "color": "#f59e0b" },
    { "name": "Side Project", "start": "13:00", "end": "17:00", "color": "#8b5cf6" }
  ]
}
```

---

## 12. Raspberry Pi Setup Notes

### Hardware
- **Model**: Raspberry Pi 5, 16GB RAM (excellent choice!)
- **Storage**: Use a quality microSD or USB SSD for reliability
- **Display**: Connect via HDMI to TV
- **Network**: Ethernet recommended for stability

### OS Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Chromium for kiosk mode
sudo apt install -y chromium-browser unclutter

# Create startup script for kiosk mode
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```

### Kiosk Mode Autostart
```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@unclutter -idle 0.1 -root
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000
```

### Auto-refresh Removal
Since you're using WebSockets for real-time updates, you won't need the Chrome extension anymore! The dashboard will update automatically when:
- You complete a habit via your Android app
- Whoop sends a webhook
- A reminder is triggered
- The schedule progresses

---

## 13. Android App Integration

### Habit Completion Endpoint
Your Android apps should POST to this endpoint when a habit is completed:

```kotlin
// Kotlin example
val client = OkHttpClient()
val json = JSONObject().apply {
    put("habitId", "workout")
    put("timestamp", System.currentTimeMillis())
}

val request = Request.Builder()
    .url("http://your-pi-ip:3000/api/habits/workout/complete")
    .post(json.toString().toRequestBody("application/json".toMediaType()))
    .build()

client.newCall(request).execute()
```

### Backup Push Endpoint
```kotlin
// Push backup file
val file = File(backupPath)
val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("backup", file.name, file.asRequestBody())
    .build()

val request = Request.Builder()
    .url("http://your-pi-ip:3000/api/backup/workout-app")
    .post(requestBody)
    .build()
```

---

## 14. Whoop Setup Steps

1. **Create Developer Account**
   - Go to https://developer.whoop.com
   - Log in with your Whoop account
   - Create a new "Team" if needed

2. **Register Application**
   - Create new app in dashboard
   - Set redirect URI: `http://your-pi-ip:3000/api/whoop/callback`
   - Request scopes: `read:recovery`, `read:cycles`, `read:sleep`, `read:workout`, `offline`

3. **Configure Webhooks**
   - In app settings, add webhook URL: `http://your-pi-ip:3000/api/whoop/webhook`
   - Enable events: `recovery.updated`, `sleep.updated`, `workout.updated`

4. **Authenticate**
   - Visit dashboard auth page to trigger OAuth flow
   - Authorize the connection
   - Tokens stored automatically

---

## 15. Dark Mode Color Palette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #262626;
  --bg-card: #1f1f1f;

  /* Text */
  --text-primary: #f5f5f5;
  --text-secondary: #a3a3a3;
  --text-muted: #737373;

  /* Accents */
  --accent-blue: #3b82f6;
  --accent-green: #22c55e;
  --accent-yellow: #f59e0b;
  --accent-red: #ef4444;
  --accent-purple: #8b5cf6;

  /* Whoop-inspired recovery colors */
  --recovery-green: #00ff87;
  --recovery-yellow: #ffdd00;
  --recovery-red: #ff4444;

  /* Habit intensity (GitHub-style) */
  --habit-none: #161b22;
  --habit-low: #0e4429;
  --habit-medium: #006d32;
  --habit-high: #26a641;
  --habit-max: #39d353;

  /* Borders */
  --border-subtle: #333333;
  --border-strong: #525252;

  /* Night mode overlay */
  --night-overlay: rgba(0, 0, 0, 0.7);
}
```

---

## 16. Next Steps

1. **Set up GitHub repository** with the project structure
2. **Initialize the project** with `npm init` and install dependencies
3. **Start with Phase 1** - get the basic layout and clock working
4. **Deploy to Pi early** - even a skeleton helps validate the setup
5. **Iterate in small chunks** - push to GitHub, pull on Pi, test on TV

Would you like me to:
- Generate the initial project boilerplate code?
- Create a more detailed component specification for any widget?
- Draft the Raspberry Pi setup script?
- Design the API client code for your Android apps?

---

## 17. Addendum: Additional Refinements

### 17.1 Timed Windows for Habits (Enhanced Model)

Instead of a single `reminder_time`, use flexible time windows:

```typescript
interface HabitTimeWindow {
  start: string;      // "07:00"
  end: string;        // "10:00"
  days: number;       // Bitmask: 127 = all days, 31 = weekdays, 96 = weekends
}

interface Habit {
  id: string;
  name: string;
  icon?: string;
  targetCount: number;
  timedWindows: HabitTimeWindow[];  // Multiple windows possible
  createdAt: Date;
}
```

**Days Bitmask Reference:**
- `1` = Monday, `2` = Tuesday, `4` = Wednesday, `8` = Thursday
- `16` = Friday, `32` = Saturday, `64` = Sunday
- `31` = Weekdays (Mon-Fri), `96` = Weekend, `127` = Every day

This lets you define "Brush teeth AM" as window 7:00-10:00 and "Brush teeth PM" as 20:00-23:00, with independent tracking.

### 17.2 Urgency Growth Formula (Concrete Implementation)

For habits with timed windows that haven't been completed:

```typescript
function calculateUrgencyScale(habit: Habit, now: Date): number {
  const window = getCurrentWindow(habit, now);
  if (!window || isCompletedToday(habit)) return 1.0;

  const windowStart = parseTime(window.start);
  const overdueMinutes = Math.max(0, differenceInMinutes(now, windowStart));

  // Grows from 1.0 to 1.8 over 2 hours of being overdue
  const scale = 1 + Math.min(0.8, (overdueMinutes / 120) * 0.8);

  return scale;
}
```

**CSS Application:**
```css
.habit-row[data-urgency] {
  transform: scale(var(--urgency-scale, 1));
  filter: brightness(calc(0.9 + var(--urgency-scale, 1) * 0.1));
  transition: transform 0.3s ease, filter 0.3s ease;
}
```

### 17.3 API Security (X-API-Key Header)

Even on your LAN, protect the API:

```typescript
// Generate once and store in .env
// API_KEY=your-32-char-random-string

// Middleware
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Apply to external-facing routes
app.post('/api/habits/:id/complete', apiKeyAuth, handleComplete);
app.post('/api/backup/:appName', apiKeyAuth, handleBackup);
```

**Android Integration:**
```kotlin
val request = Request.Builder()
    .url("http://your-pi-ip:3000/api/habits/workout/complete")
    .addHeader("X-API-Key", BuildConfig.DASHBOARD_API_KEY)
    .post(json.toString().toRequestBody("application/json".toMediaType()))
    .build()
```

### 17.4 Reminder Mode Options

Support different severity levels:

```typescript
type ReminderMode = 'banner' | 'overlay' | 'flash_takeover';

interface Reminder {
  id: string;
  title: string;
  time: string;
  days: number;           // Bitmask
  warnMinutes: number;
  mode: ReminderMode;     // NEW: determines visual behavior
  isActive: boolean;
}
```

| Mode | Behavior |
|------|----------|
| `banner` | Small notification bar at top, doesn't block UI |
| `overlay` | Semi-transparent overlay, UI still visible beneath |
| `flash_takeover` | Full-screen flashing red, blocks everything |

### 17.5 Calendar/ICS Import (New Feature)

Auto-import meetings from Google Calendar, Outlook, etc.:

```typescript
// New endpoint
GET /api/calendar/sync

// Config
interface CalendarConfig {
  icsUrl: string;           // Public or private ICS feed URL
  syncIntervalMinutes: number;
  autoCreateReminders: boolean;
  defaultWarnMinutes: number;
  defaultReminderMode: ReminderMode;
}
```

**Implementation:**
```typescript
import ical from 'node-ical';

async function syncCalendar() {
  const events = await ical.async.fromURL(config.icsUrl);

  for (const event of Object.values(events)) {
    if (event.type !== 'VEVENT') continue;

    // Add to schedule blocks or reminders
    await upsertCalendarEvent({
      title: event.summary,
      start: event.start,
      end: event.end,
      source: 'ics'
    });
  }
}
```

This eliminates manual entry for recurring meetings!

### 17.6 Additional Widgets

#### "Now / Next / Later" Text Widget
```
┌────────────────────────────────────────────┐
│ NOW    Work              2h 15m left      │
│ NEXT   Workout           in 2h 15m        │
│ LATER  Lunch, Work, Side Project          │
└────────────────────────────────────────────┘
```
Text-based companion to the visual timeline for quick parsing.

#### Weekly Training Load
```
┌────────────────────────────────────────────┐
│ 📊 THIS WEEK                               │
│ Workouts: 4/5  ·  2h 45m trained  ·  ↑12% │
└────────────────────────────────────────────┘
```
Aggregates workout habit completions with trend arrow.

### 17.7 Midnight-Crossing Schedule Blocks

Handle blocks that span midnight (e.g., "Night Owl Coding" 11pm-2am):

```typescript
function renderScheduleBlocks(blocks: ScheduleBlock[], date: Date) {
  return blocks.flatMap(block => {
    const start = parseTime(block.startTime);
    const end = block.endTime ? parseTime(block.endTime) : null;

    // If end time is before start time, it crosses midnight
    if (end && end < start) {
      return [
        { ...block, endTime: '23:59', segment: 1 },
        { ...block, startTime: '00:00', segment: 2 }
      ];
    }
    return [block];
  });
}
```

### 17.8 CSS Grid Layout Spec (Explicit)

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto 1fr 1fr 1fr auto auto;
  height: 100vh;
  gap: 1rem;
  padding: 1rem;
}

.clock {
  grid-column: 1 / -1;
  grid-row: 1;
}

.habit-tracker {
  grid-column: 1 / -1;
  grid-row: 2 / 5;  /* Spans 3 rows */
}

.widget-row {  /* Whoop, Weather, etc. */
  grid-column: 1 / -1;
  grid-row: 5;
}

.timeline {
  grid-column: 1 / -1;
  grid-row: 6;
}

/* Night mode */
.night-mode {
  filter: brightness(0.55);
  transition: filter 30s ease;
}
```

### 17.9 Alternative Stack: Python/FastAPI

If you prefer Python over Node.js:

```
lifeboard/
├── pyproject.toml
├── .env
├── app/
│   ├── main.py           # FastAPI entry
│   ├── database.py       # SQLAlchemy setup
│   ├── models.py         # ORM models
│   ├── routers/
│   │   ├── habits.py
│   │   ├── schedule.py
│   │   ├── reminders.py
│   │   ├── whoop.py
│   │   └── backup.py
│   ├── services/
│   │   ├── scheduler.py  # APScheduler for reminders
│   │   └── websocket.py  # Real-time updates
│   └── static/           # SvelteKit build output
└── frontend/             # SvelteKit source
```

**Dependencies:**
```
fastapi
uvicorn
sqlalchemy
apscheduler
python-multipart  # For file uploads
httpx             # For Whoop API calls
```

**Run command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

Both stacks work well on Pi 5. Choose based on your comfort level.

### 17.10 System Health Footer (Minimal)

Instead of a full widget, a subtle footer:

```
┌──────────────────────────────────────────────────────────────────┐
│ CPU 23% · RAM 1.2GB · 45°C · Uptime 14d · Last sync 2m ago     │
└──────────────────────────────────────────────────────────────────┘
```

Tiny, unobtrusive, but alerts you if something's wrong.

---

## 18. Updated Database Schema

Incorporating bitmasks and timed windows:

```sql
-- Habits with timed windows
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  timed_windows TEXT,  -- JSON: [{"start":"07:00","end":"10:00","days":127}]
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedule blocks with bitmask
CREATE TABLE schedule_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  days_mask INTEGER NOT NULL DEFAULT 127,  -- Bitmask instead of JSON
  position INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reminders with mode
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  time TEXT NOT NULL,
  days_mask INTEGER NOT NULL DEFAULT 127,
  warn_minutes INTEGER NOT NULL DEFAULT 3,
  mode TEXT NOT NULL DEFAULT 'overlay',  -- banner|overlay|flash_takeover
  is_active BOOLEAN NOT NULL DEFAULT 1,
  source TEXT DEFAULT 'manual',  -- manual|ics
  external_id TEXT,              -- For ICS sync deduplication
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Calendar sync config
CREATE TABLE calendar_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ics_url TEXT NOT NULL,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
  auto_create_reminders BOOLEAN NOT NULL DEFAULT 1,
  default_warn_minutes INTEGER NOT NULL DEFAULT 3,
  default_reminder_mode TEXT NOT NULL DEFAULT 'banner',
  last_synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## The best things to steal (high value, low regret)

### 1) **Habit model: “count + timestamps”**

Their `targetCount` + `completedAt[]` idea is exactly what you need for:

* “Brush teeth” done 2x/day (AM/PM) with **shading intensity**
* Storing multiple completions per day without weird hacks

**How I’d implement it (cleaner):**

* Keep **event rows** (`habit_events`) as truth
* Derive daily `count` and shading from events (or cache it in a daily aggregate table if you want speed)

This gives you GitHub-style intensity *and* preserves exact times for the “growing urgency” behavior.

---

### 2) **Backup retention policy**

“Keep last 30 backups per app” is a great default. Add:

* optional compression
* SHA256 checksum
* a “latest” endpoint (super handy for restore automation)

---

### 3) **Clear repo structure + scripts**

Their folder layout + scripts (`setup-pi.sh`, `deploy.sh`) is exactly what makes this project *actually maintainable* when you’re SSH’ing into a Pi.

This is one of the biggest practical upgrades vs a purely “architectural” plan.

---

### 4) **Explicit realtime event names**

Having a defined event contract like:

* `habit:updated`
* `reminder:trigger`
* `whoop:updated`
  makes the UI simple and prevents “random websocket spaghetti”.

Even if you don’t use Socket.IO, the **event naming** idea is great.

---

### 5) **Kiosk-mode autostart notes**

Their Chromium kiosk autostart snippet is helpful (and battle-tested). You’ll adapt it depending on whether you’re using Raspberry Pi OS with LXDE/Wayfire/whatever — but the concept is right.

---

### 6) **Settings table**

A `settings(key,value)` table is a nice, simple way to store:

* dim hours
* warning minutes
* theme preferences
* TV layout options
  without having to hardcode everything or rebuild the app for tiny changes.

---

## What I’d tweak (so it fits *your* goals better)

### A) Don’t over-commit to a Node stack just because it’s “realtime friendly”

Their Node/Fastify/Socket.IO stack is totally valid.

But your needs are simple enough that:

* **FastAPI + WebSocket** (Python) is also excellent, and very Pi-friendly
* **SSE** is even simpler if the dashboard is one-way updates most of the time

**Rule of thumb:**

* If you want bidirectional features like snooze/dismiss, Socket.IO is convenient.
* If you mostly push updates to the screen, plain WebSocket/SSE is simpler.

Either way works — just don’t pick Socket.IO unless you actually want its reconnection/rooms/features.

---

### B) Their `habit_entries` “JSON timestamps in one row” works, but event rows scale better

Storing `completed_at` as JSON is fine for small scale, but event rows are easier for:

* querying ranges
* computing streaks cleanly
* auditing sources (your Android apps vs manual UI)

So I’d keep:

* `habit_events` table (one row per completion)
  and optionally cache:
* `habit_day_aggregate` for fast heatmap rendering

---

### C) Night mode: do it visually + optionally via OS brightness

Their CSS overlay idea is perfect for the UI.
If you want the *TV* to actually dim more, you can later add optional Pi-level brightness tools — but UI-only dimming gets you 90% of the benefit fast.

---

### D) Weather/Spotify/Quotes are “nice”, but your best widgets are *actionable*

Their widget list is fun. For your dashboard, the winners are:

* **Pi health** (so you notice when disk/temp is bad)
* **Focus timer auto-linked to schedule blocks**
* **Meeting/reminder overlay system**
* **Whoop “high-signal” metrics panel** (recovery/sleep/strain)

Quotes and “now playing” are optional fluff unless you truly want them.

---

## How this improves *our* plan (concrete upgrades)

### Updated “core decisions” I’d adopt

1. **Habits support multi-occurrence** via `targetCount` + event timestamps
2. **Backup retention**: keep last N backups/app
3. **Repo structure + scripts** for Pi setup + deploy
4. **Event contract** for realtime messages
5. **Settings table** to avoid hardcoding

### One important add I didn’t emphasize enough before

**Config-first schedule**: start with a JSON schedule file that loads into SQLite on boot (seed/migrate).
That way you can iterate quickly without building a full schedule editor UI on day 1.

---

## A sharper “MVP-first” plan after merging both approaches

### MVP 1 (fast win)

* Clock
* Timeline progress bar (weekday/weekend)
* Habit heatmap for last 30 days (static seed data)
* Kiosk running on Pi

### MVP 2 (kills refresh extension forever)

* `POST /api/habits/:id/events` (API key)
* WebSocket/SSE push → UI updates instantly

### MVP 3 (the “wow” factor)

* Reminder overlay takeover + warn offset
* Night dim mode

### MVP 4 (quality of life)

* Backup upload + retention + “latest”
* Pi health widget

### MVP 5 (optional, but cool)

* WHOOP widget via OAuth + webhooks

---

If you want, I can now turn the merged plan into a **single concrete spec**:

* exact DB tables (event-based)
* exact API routes + payloads
* websocket event schema
* a repo skeleton layout (frontend + backend + scripts)
* and a Pi deploy approach (systemd or PM2 + kiosk autostart)

