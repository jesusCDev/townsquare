#!/bin/bash
# Launch LifeBoard in kiosk mode on dual monitors (Wayland-compatible)
# Usage: ./scripts/kiosk.sh
#
# Prerequisites:
#   sudo apt install ydotool
#
# Monitor setup:
#   Run `xrandr --display :0` on your Pi to see monitor names.
#   Current setup: XWAYLAND1 (TV 1920x1080), XWAYLAND0 (touchscreen 1024x600)

set -e

export DISPLAY=:0

# --- Configuration ---
APP_URL="http://localhost:5173"  # Change to :3000 in production
# ----------------------

echo "Starting LifeBoard kiosk mode..."

# Kill any existing Firefox instances
pkill -f firefox 2>/dev/null && sleep 2 || true

# Launch Firefox in kiosk mode for the dashboard (TV) on XWAYLAND1
# --kiosk starts Firefox in fullscreen with no browser chrome
MOZ_ENABLE_WAYLAND=1 firefox --kiosk "${APP_URL}/" &
DASH_PID=$!
sleep 4

# Launch a second Firefox profile for the mobile view (touchscreen) on XWAYLAND0
# Using a separate profile allows two independent Firefox windows
MOZ_ENABLE_WAYLAND=1 firefox --kiosk --new-window "${APP_URL}/mobile" &
MOBILE_PID=$!
sleep 4

echo "Firefox launched:"
echo "  Dashboard (kiosk): PID $DASH_PID"
echo "  Mobile (kiosk):    PID $MOBILE_PID"
echo ""
echo "Note: Firefox --kiosk starts fullscreen automatically."
echo "If windows are on the wrong monitors, you may need to"
echo "configure your window manager to place windows by title."
echo ""
echo "To toggle fullscreen later: ./scripts/fullscreen.sh"
echo "Or via API: curl -X POST http://localhost:3000/api/system/fullscreen"
