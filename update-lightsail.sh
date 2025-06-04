#!/bin/bash

# Update script for CBO CSS Snips on AWS Lightsail
# This script safely updates the application while preserving data

set -e  # Exit on any error

echo "🚀 Starting CBO CSS Snips update..."

# Configuration
PROJECT_DIR="/opt/bitnami/projects/csssnip"
BACKUP_DIR="$HOME/backups/$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="/tmp/csssnip_update"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on Lightsail/Bitnami
if [ ! -d "/opt/bitnami" ]; then
    log_error "This script is designed for AWS Lightsail with Bitnami. Directory /opt/bitnami not found."
    exit 1
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory $PROJECT_DIR not found. Please run initial setup first."
    exit 1
fi

cd "$PROJECT_DIR"

# 1. Create backup
log_info "Creating backup..."
mkdir -p "$BACKUP_DIR"

# Backup databases
if [ -f "snippets.db" ]; then
    cp snippets.db "$BACKUP_DIR/"
    log_info "✅ Backed up snippets.db"
fi

if [ -f "sessions.db" ]; then
    cp sessions.db "$BACKUP_DIR/"
    log_info "✅ Backed up sessions.db"
fi

# Backup .env
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/"
    log_info "✅ Backed up .env"
fi

log_info "📦 Backup created at: $BACKUP_DIR"

# 2. Stop the application
log_info "Stopping application..."
pm2 stop all 2>/dev/null || true

# 3. Backup current code and databases
log_info "Preserving data files..."
mkdir -p /tmp/csssnip_preserve
[ -f "snippets.db" ] && mv snippets.db /tmp/csssnip_preserve/
[ -f "sessions.db" ] && mv sessions.db /tmp/csssnip_preserve/
[ -f ".env" ] && mv .env /tmp/csssnip_preserve/

# 4. Update code
log_info "Updating code..."
if [ -d ".git" ]; then
    # Git repository - pull latest
    git stash 2>/dev/null || true
    git fetch origin
    git pull origin main
    log_info "✅ Code updated from git"
else
    log_warn "Not a git repository. Please manually update the code and run this script again."
    # Restore preserved files
    [ -f "/tmp/csssnip_preserve/snippets.db" ] && mv /tmp/csssnip_preserve/snippets.db ./
    [ -f "/tmp/csssnip_preserve/sessions.db" ] && mv /tmp/csssnip_preserve/sessions.db ./
    [ -f "/tmp/csssnip_preserve/.env" ] && mv /tmp/csssnip_preserve/.env ./
    exit 1
fi

# 5. Restore preserved files
log_info "Restoring data files..."
[ -f "/tmp/csssnip_preserve/snippets.db" ] && mv /tmp/csssnip_preserve/snippets.db ./
[ -f "/tmp/csssnip_preserve/sessions.db" ] && mv /tmp/csssnip_preserve/sessions.db ./
[ -f "/tmp/csssnip_preserve/.env" ] && mv /tmp/csssnip_preserve/.env ./

# 6. Install/update dependencies
log_info "Installing dependencies..."
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Handle sqlite3 issues
if ! npm list sqlite3 >/dev/null 2>&1; then
    log_warn "Rebuilding sqlite3..."
    npm install --build-from-source sqlite3
fi

# 7. Run migrations (if any new ones exist)
log_info "Running database migrations..."
if [ -d "migrations" ]; then
    for migration in migrations/*.js; do
        if [ -f "$migration" ]; then
            log_info "Running migration: $migration"
            node "$migration" || log_warn "Migration $migration may have already been applied"
        fi
    done
fi

# 8. Set correct permissions
log_info "Setting permissions..."
sudo chown -R bitnami:bitnami "$PROJECT_DIR"
find "$PROJECT_DIR" -type f -exec chmod 644 {} \;
find "$PROJECT_DIR" -type d -exec chmod 755 {} \;
chmod +x *.sh 2>/dev/null || true
chmod 664 *.db 2>/dev/null || true

# 9. Restart the application
log_info "Starting application..."
pm2 start ecosystem.config.js
pm2 save

# 10. Wait a moment and check status
sleep 3
log_info "Checking application status..."

if pm2 status | grep -q "online"; then
    log_info "✅ Application is running"
    
    # Test the application
    if curl -s http://localhost:3000 >/dev/null; then
        log_info "✅ Application is responding"
    else
        log_warn "⚠️  Application may not be responding correctly"
    fi
else
    log_error "❌ Application failed to start"
    log_info "📋 Check logs with: pm2 logs"
    exit 1
fi

# 11. Restart Apache to ensure proxy is working
log_info "Restarting Apache..."
sudo /opt/bitnami/ctlscript.sh restart apache

# Clean up
rm -rf /tmp/csssnip_preserve 2>/dev/null || true

echo ""
log_info "🎉 Update completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Test the application: https://your-domain.com"
echo "  2. Check logs if needed: pm2 logs"
echo "  3. Monitor status: pm2 monit"
echo ""
echo "📦 Backup location: $BACKUP_DIR"
echo ""

# Show current status
pm2 status