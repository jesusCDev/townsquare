#!/bin/bash
# Launch LifeBoard in kiosk mode on dual monitors
# Usage: ./scripts/kiosk.sh
#
# Prerequisites:
#   sudo apt install xdotool
#
# Monitor setup (adjust these to match your setup):
#   Run `xrandr` on your Pi to see monitor names and resolutions.
#   Common names: HDMI-1, HDMI-2, DSI-1 (for the official touchscreen)

set -e

export DISPLAY=:0

# --- Configuration ---
APP_URL="http://localhost:5173"  # Change to :3000 in production
TV_MONITOR="HDMI-1"             # Monitor name for the TV (dashboard)
TOUCH_MONITOR="HDMI-2"          # Monitor name for the touchscreen (mobile)
# ----------------------

echo "Starting LifeBoard kiosk mode..."

# Kill any existing Firefox instances
pkill -f firefox 2>/dev/null && sleep 1 || true

# Get monitor geometry from xrandr
# Format: WIDTHxHEIGHT+X_OFFSET+Y_OFFSET
get_monitor_geometry() {
  local monitor=$1
  xrandr | grep "^${monitor}" | grep -oP '\d+x\d+\+\d+\+\d+' | head -1
}

TV_GEOM=$(get_monitor_geometry "$TV_MONITOR")
TOUCH_GEOM=$(get_monitor_geometry "$TOUCH_MONITOR")

if [ -z "$TV_GEOM" ]; then
  echo "Warning: Could not detect $TV_MONITOR. Available monitors:"
  xrandr | grep " connected"
  echo ""
  echo "Update TV_MONITOR in this script to match your setup."
  exit 1
fi

if [ -z "$TOUCH_GEOM" ]; then
  echo "Warning: Could not detect $TOUCH_MONITOR. Available monitors:"
  xrandr | grep " connected"
  echo ""
  echo "Update TOUCH_MONITOR in this script to match your setup."
  exit 1
fi

# Parse geometry: WxH+X+Y
parse_geom() {
  local geom=$1
  echo "$geom" | sed 's/x/ /;s/+/ /g'
}

read TV_W TV_H TV_X TV_Y <<< "$(parse_geom "$TV_GEOM")"
read TOUCH_W TOUCH_H TOUCH_X TOUCH_Y <<< "$(parse_geom "$TOUCH_GEOM")"

echo "TV ($TV_MONITOR): ${TV_W}x${TV_H} at +${TV_X}+${TV_Y}"
echo "Touchscreen ($TOUCH_MONITOR): ${TOUCH_W}x${TOUCH_H} at +${TOUCH_X}+${TOUCH_Y}"

# Launch Firefox for the dashboard (TV)
firefox --new-window "${APP_URL}/" &
sleep 3

# Move the dashboard window to the TV monitor
DASH_WID=$(xdotool search --name "LifeBoard" 2>/dev/null | head -1)
if [ -n "$DASH_WID" ]; then
  xdotool windowmove "$DASH_WID" "$TV_X" "$TV_Y"
  xdotool windowsize "$DASH_WID" "$TV_W" "$TV_H"
  echo "Dashboard window placed on $TV_MONITOR"
fi

# Launch Firefox for the mobile view (touchscreen)
firefox --new-window "${APP_URL}/mobile" &
sleep 3

# Find the mobile window (the newest Firefox window that isn't the dashboard)
ALL_WIDS=$(xdotool search --class Firefox 2>/dev/null)
for WID in $ALL_WIDS; do
  if [ "$WID" != "$DASH_WID" ]; then
    MOBILE_WID=$WID
  fi
done

if [ -n "$MOBILE_WID" ]; then
  xdotool windowmove "$MOBILE_WID" "$TOUCH_X" "$TOUCH_Y"
  xdotool windowsize "$MOBILE_WID" "$TOUCH_W" "$TOUCH_H"
  echo "Mobile window placed on $TOUCH_MONITOR"
fi

# Wait for windows to settle
sleep 1

# Fullscreen both windows
for WID in $DASH_WID $MOBILE_WID; do
  if [ -n "$WID" ]; then
    xdotool key --window "$WID" F11
  fi
done

echo "Both windows are now fullscreen."
echo ""
echo "To toggle fullscreen later: ./scripts/fullscreen.sh"
echo "Or via API: curl -X POST http://localhost:3000/api/system/fullscreen"
