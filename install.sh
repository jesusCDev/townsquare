#!/bin/bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Node.js if not present
install_nodejs() {
    if command_exists node; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 20 ]; then
            log_info "Node.js $(node -v) is already installed"
            return 0
        else
            log_warn "Node.js version is $(node -v), but v20+ is recommended"
        fi
    fi

    log_info "Installing Node.js 20..."
    
    # Detect package manager for Fedora
    if command_exists dnf; then
        log_info "Using dnf to install Node.js..."
        if ! sudo dnf module list nodejs 2>/dev/null | grep -q "nodejs:20"; then
            log_info "Enabling Node.js 20 module..."
            sudo dnf module reset nodejs -y || log_warn "Could not reset nodejs module"
            sudo dnf module enable nodejs:20 -y || log_error "Failed to enable nodejs:20 module"
        fi
        sudo dnf install nodejs -y || {
            log_error "Failed to install Node.js via dnf. Trying alternative method..."
            install_nodejs_nvm
            return $?
        }
    else
        log_info "dnf not found, installing Node.js via nvm..."
        install_nodejs_nvm
        return $?
    fi
    
    log_info "Node.js $(node -v) installed successfully"
}

# Install Node.js via nvm as fallback
install_nodejs_nvm() {
    if [ ! -d "$HOME/.nvm" ]; then
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash || {
            log_error "Failed to install nvm"
            return 1
        }
    fi
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    log_info "Installing Node.js 20 via nvm..."
    nvm install 20 || {
        log_error "Failed to install Node.js via nvm"
        return 1
    }
    nvm use 20
    nvm alias default 20
}

# Install pnpm
install_pnpm() {
    if command_exists pnpm; then
        log_info "pnpm $(pnpm -v) is already installed"
        return 0
    fi
    
    log_info "Installing pnpm..."
    
    # Try using npm first
    if command_exists npm; then
        npm install -g pnpm || {
            log_warn "Failed to install pnpm via npm, trying alternative method..."
            curl -fsSL https://get.pnpm.io/install.sh | sh - || {
                log_error "Failed to install pnpm"
                return 1
            }
        }
    else
        curl -fsSL https://get.pnpm.io/install.sh | sh - || {
            log_error "Failed to install pnpm"
            return 1
        }
    fi
    
    # Add pnpm to PATH for current session
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
    
    log_info "pnpm $(pnpm -v) installed successfully"
}

# Main installation
main() {
    log_info "Starting TownSquare installation..."
    log_info "Project directory: $(pwd)"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the TownSquare directory."
        exit 1
    fi
    
    # Install Node.js
    install_nodejs || {
        log_error "Failed to install Node.js"
        exit 1
    }
    
    # Install pnpm
    install_pnpm || {
        log_error "Failed to install pnpm"
        exit 1
    }
    
    # Verify installations
    log_info "Verifying installations..."
    log_info "  Node.js: $(node -v)"
    log_info "  npm: $(npm -v)"
    log_info "  pnpm: $(pnpm -v)"
    
    # Install project dependencies
    log_info "Installing project dependencies..."
    pnpm install || {
        log_error "Failed to install project dependencies"
        exit 1
    }
    
    # Setup environment file
    if [ ! -f ".env" ]; then
        log_info "Creating .env file from .env.example..."
        cp .env.example .env || {
            log_error "Failed to create .env file"
            exit 1
        }
        log_warn "Please review and update .env file with your configuration"
    else
        log_info ".env file already exists, skipping creation"
    fi
    
    # Setup database
    log_info "Setting up database..."
    
    # Generate database schema
    log_info "Generating database schema..."
    pnpm db:generate || {
        log_warn "Database schema generation had warnings, continuing..."
    }
    
    # Run migrations
    log_info "Running database migrations..."
    pnpm db:migrate || {
        log_error "Failed to run database migrations"
        exit 1
    }
    
    # Seed database (only if data directory doesn't have existing database)
    if [ ! -f "data/lifeboard.db" ] || [ ! -s "data/lifeboard.db" ]; then
        log_info "Seeding database with initial data..."
        pnpm db:seed || {
            log_warn "Database seeding had issues, but continuing..."
        }
    else
        log_info "Database already exists, skipping seeding"
    fi
    
    # Make start script executable
    chmod +x start.sh 2>/dev/null || log_warn "Could not make start.sh executable"
    
    log_info ""
    log_info "======================================"
    log_info "${GREEN}Installation completed successfully!${NC}"
    log_info "======================================"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Review and update the .env file if needed"
    log_info "  2. Run './start.sh' to start the application"
    log_info "  3. Open http://localhost:5173 in your browser"
    log_info ""
}

# Run main installation
main "$@"
