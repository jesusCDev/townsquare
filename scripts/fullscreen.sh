#!/bin/bash
# Toggle fullscreen (F11) on the focused window using ydotool (Wayland-compatible)
# Usage: ./scripts/fullscreen.sh
# Alias: alias fs='~/developer/townsquare/scripts/fullscreen.sh'
#
# Note: ydotool sends input at the kernel level, so it targets the currently
# focused window. If you have two Firefox windows, run this script once per window
# (click/focus the other window in between).

# F11 keycode = 87, :1 = press, :0 = release
sudo ydotool key 87:1 87:0

echo "Sent F11 to focused window"
