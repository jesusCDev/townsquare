#!/bin/bash
# Toggle fullscreen (F11) on all Firefox windows
# Usage: ./scripts/fullscreen.sh
# Alias: alias fs='~/developer/townsquare/scripts/fullscreen.sh'

export DISPLAY=:0

WINDOW_IDS=$(xdotool search --class Firefox 2>/dev/null)

if [ -z "$WINDOW_IDS" ]; then
  echo "No Firefox windows found"
  exit 1
fi

COUNT=0
for WID in $WINDOW_IDS; do
  xdotool key --window "$WID" F11
  COUNT=$((COUNT + 1))
done

echo "Toggled fullscreen on $COUNT Firefox window(s)"
