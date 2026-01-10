#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "Stopping TownSquare/LifeBoard..."

# Kill by PID file if it exists
if [ -f ".app.pid" ]; then
    pid=$(cat .app.pid)
    if ps -p $pid > /dev/null 2>&1; then
        log_info "Killing process with PID $pid..."
        kill -9 $pid 2>/dev/null || log_warn "Could not kill PID $pid"
    else
        log_warn "Process with PID $pid not found"
    fi
    rm -f .app.pid
    log_info "Removed .app.pid file"
fi

# Kill processes on ports
for port in 3000 5173 5174; do
    if lsof -ti:$port >/dev/null 2>&1; then
        log_info "Killing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || log_warn "Could not kill process on port $port"
    fi
done

# Kill by process name patterns
pkill -9 -f "town-square" 2>/dev/null || true
pkill -9 -f "lifeboard" 2>/dev/null || true
pkill -9 -f "apps/server" 2>/dev/null || true
pkill -9 -f "apps/web" 2>/dev/null || true

# Kill any node processes running from this directory
current_dir=$(pwd)
pkill -9 -f "node.*${current_dir}" 2>/dev/null || true

# Wait for cleanup
sleep 1

# Verify all stopped
all_stopped=true
for port in 3000 5173 5174; do
    if lsof -ti:$port >/dev/null 2>&1; then
        log_error "Port $port still in use!"
        all_stopped=false
    fi
done

if [ "$all_stopped" = true ]; then
    log_info "All processes stopped successfully"
else
    log_error "Some processes may still be running"
    log_info "Run: lsof -i :3000 -i :5173 to check"
fi
