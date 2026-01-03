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

# Check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    log_info "Checking port $port..."
    
    if check_port $port; then
        log_warn "Port $port is already in use"
        read -p "Kill the process using port $port? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Killing process on port $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || {
                log_warn "Could not kill process on port $port"
                return 1
            }
            sleep 1
            log_info "Process killed"
        else
            log_error "Cannot start server while port $port is in use"
            return 1
        fi
    else
        log_info "Port $port is available"
    fi
    return 0
}

# Check if dependencies are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        log_warn "Dependencies not installed. Running installation..."
        pnpm install || {
            log_error "Failed to install dependencies"
            return 1
        }
    fi
    
    if [ ! -f ".env" ]; then
        log_warn ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warn "Please review and update .env file with your configuration"
        else
            log_error ".env.example not found"
            return 1
        fi
    fi
    
    return 0
}

# Check database
check_database() {
    log_info "Checking database..."
    
    if [ ! -d "data" ]; then
        mkdir -p data
        log_info "Created data directory"
    fi
    
    if [ ! -f "data/lifeboard.db" ]; then
        log_warn "Database not found. Running migrations and seeding..."
        pnpm db:generate || log_warn "Schema generation warnings (this is usually OK)"
        pnpm db:migrate || {
            log_error "Failed to run migrations"
            return 1
        }
        pnpm db:seed || log_warn "Seeding warnings (this is usually OK)"
    else
        log_info "Database exists"
    fi
    
    return 0
}

# Trap Ctrl+C
cleanup() {
    log_info ""
    log_info "Shutting down servers..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main startup
main() {
    log_info "======================================"
    log_info "    Starting TownSquare/LifeBoard    "
    log_info "======================================"
    log_info ""
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the TownSquare directory."
        exit 1
    fi
    
    # Check Node.js and pnpm
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed. Please run ./install.sh first."
        exit 1
    fi
    
    if ! command -v pnpm >/dev/null 2>&1; then
        log_error "pnpm is not installed. Please run ./install.sh first."
        exit 1
    fi
    
    log_info "Node.js: $(node -v)"
    log_info "pnpm: $(pnpm -v)"
    log_info ""
    
    # Check dependencies
    check_dependencies || exit 1
    
    # Check database
    check_database || exit 1
    
    # Check ports
    log_info ""
    log_info "Checking ports..."
    kill_port 3000 || exit 1  # Backend
    kill_port 5173 || exit 1  # Frontend
    
    # Start the application
    log_info ""
    log_info "======================================"
    log_info "Starting development servers..."
    log_info "======================================"
    log_info ""
    log_info "${BLUE}Frontend:${NC} http://localhost:5173"
    log_info "${BLUE}Backend:${NC}  http://localhost:3000"
    log_info ""
    log_info "Press Ctrl+C to stop all servers"
    log_info ""
    
    # Start with turbo (runs both frontend and backend)
    pnpm dev
}

# Run main
main "$@"
