#!/bin/bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==>${NC} $1"
}

# Kill existing processes
kill_existing() {
    log_step "Stopping existing TownSquare processes..."
    
    # Kill by PID file if it exists
    if [ -f ".app.pid" ]; then
        local pid=$(cat .app.pid)
        if ps -p $pid > /dev/null 2>&1; then
            log_info "Killing process with PID $pid..."
            kill -9 $pid 2>/dev/null || log_warn "Could not kill PID $pid"
        fi
        rm -f .app.pid
    fi
    
    # Kill processes on ports 3000 and 5173
    for port in 3000 5173 5174; do
        if lsof -ti:$port >/dev/null 2>&1; then
            log_info "Killing process on port $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || log_warn "Could not kill process on port $port"
            sleep 0.5
        fi
    done
    
    # Kill by process name patterns
    pkill -9 -f "town-square" 2>/dev/null || true
    pkill -9 -f "lifeboard" 2>/dev/null || true
    pkill -9 -f "apps/server" 2>/dev/null || true
    pkill -9 -f "apps/web" 2>/dev/null || true
    
    # Kill any node processes running from this directory
    local current_dir=$(pwd)
    pkill -9 -f "node.*${current_dir}" 2>/dev/null || true
    
    # Wait a moment for processes to die
    sleep 1
    
    # Verify ports are clear
    local ports_clear=true
    for port in 3000 5173 5174; do
        if lsof -ti:$port >/dev/null 2>&1; then
            log_warn "Port $port still in use after cleanup!"
            ports_clear=false
        fi
    done
    
    if [ "$ports_clear" = true ]; then
        log_info "Successfully stopped all existing processes"
    else
        log_error "Some processes may still be running. Check manually with: lsof -i :3000 -i :5173"
    fi
}

# Pull latest changes
pull_changes() {
    log_step "Pulling latest changes from GitHub..."
    
    # Stash any local changes
    if ! git diff-index --quiet HEAD --; then
        log_warn "Local changes detected. Stashing..."
        git stash
    fi
    
    git pull origin main || {
        log_error "Failed to pull changes"
        exit 1
    }
    
    log_info "Successfully pulled latest changes"
}

# Install/update dependencies
update_dependencies() {
    log_step "Updating dependencies..."
    
    pnpm install || {
        log_error "Failed to install dependencies"
        exit 1
    }
    
    log_info "Dependencies updated"
}

# Run database migrations
run_migrations() {
    log_step "Running database migrations..."
    
    # Check if database exists
    if [ ! -f "data/lifeboard.db" ]; then
        log_warn "Database not found. Creating new database..."
        mkdir -p data
        pnpm db:generate || log_warn "Schema generation warnings (this is usually OK)"
        pnpm db:migrate || {
            log_error "Failed to run migrations"
            exit 1
        }
        pnpm db:seed || log_warn "Seeding warnings (this is usually OK)"
    else
        # Just run migrations on existing database
        pnpm db:migrate || {
            log_error "Failed to run migrations"
            exit 1
        }
    fi
    
    log_info "Database migrations completed"
}

# Build application
build_app() {
    log_step "Building application..."
    
    pnpm build || {
        log_error "Failed to build application"
        exit 1
    }
    
    log_info "Build completed"
}

# Start application in background
start_app() {
    log_step "Starting application..."
    
    # Check if we should start in production or development mode
    if [ "$1" = "--dev" ]; then
        log_info "Starting in development mode..."
        nohup pnpm dev > logs/app.log 2>&1 &
        echo $! > .app.pid
        log_info "Development server started (PID: $(cat .app.pid))"
        log_info "Frontend: http://localhost:5173"
        log_info "Backend: http://localhost:3000"
    else
        log_info "Starting in production mode..."
        nohup pnpm start > logs/app.log 2>&1 &
        echo $! > .app.pid
        log_info "Production server started (PID: $(cat .app.pid))"
        log_info "Application: http://localhost:3000"
    fi
    
    log_info "Logs: tail -f logs/app.log"
}

# Main update process
main() {
    log_info "======================================"
    log_info "   TownSquare/LifeBoard Updater"
    log_info "======================================"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the TownSquare directory."
        exit 1
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Check if Node.js and pnpm are installed
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed. Please run ./install.sh first."
        exit 1
    fi
    
    if ! command -v pnpm >/dev/null 2>&1; then
        log_error "pnpm is not installed. Please run ./install.sh first."
        exit 1
    fi
    
    # Parse arguments
    DEV_MODE=false
    if [ "$1" = "--dev" ]; then
        DEV_MODE=true
    fi
    
    # Run update steps
    kill_existing
    pull_changes
    update_dependencies
    run_migrations
    
    if [ "$DEV_MODE" = false ]; then
        build_app
    fi
    
    start_app "$1"
    
    log_info ""
    log_info "======================================"
    log_info "   Update completed successfully!"
    log_info "======================================"
    log_info ""
    log_info "To view logs: tail -f logs/app.log"
    log_info "To stop: kill \$(cat .app.pid)"
    log_info ""
}

# Run main
main "$@"
