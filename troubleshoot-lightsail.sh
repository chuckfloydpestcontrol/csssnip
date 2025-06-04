#!/bin/bash

# Troubleshooting script for CBO CSS Snips on AWS Lightsail
# This script checks common issues and provides diagnostic information

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 CBO CSS Snips Troubleshoot Tool${NC}"
echo "=================================="

# Configuration
PROJECT_DIR="/opt/bitnami/projects/csssnip"

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_check() {
    echo -e "${BLUE}🔍 Checking: $1${NC}"
}

# Check 1: Project directory exists
log_check "Project directory"
if [ -d "$PROJECT_DIR" ]; then
    log_info "Project directory exists: $PROJECT_DIR"
    cd "$PROJECT_DIR"
else
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Check 2: Required files
log_check "Required files"
for file in server.js package.json ecosystem.config.js; do
    if [ -f "$file" ]; then
        log_info "$file exists"
    else
        log_error "$file missing"
    fi
done

# Check 3: Database files
log_check "Database files"
for db in snippets.db sessions.db; do
    if [ -f "$db" ]; then
        log_info "$db exists"
        # Check permissions
        if [ -r "$db" ] && [ -w "$db" ]; then
            log_info "$db has correct permissions"
        else
            log_warn "$db permission issue - fixing..."
            chmod 664 "$db"
            chown bitnami:bitnami "$db"
        fi
        
        # Check if database is accessible
        if sqlite3 "$db" ".tables" >/dev/null 2>&1; then
            log_info "$db is accessible"
        else
            log_error "$db is corrupted or inaccessible"
        fi
    else
        log_error "$db missing"
    fi
done

# Check 4: Environment variables
log_check "Environment variables"
if [ -f ".env" ]; then
    log_info ".env file exists"
    
    # Check key variables
    source .env 2>/dev/null || true
    
    if [ -n "$NODE_ENV" ]; then
        log_info "NODE_ENV is set to: $NODE_ENV"
    else
        log_warn "NODE_ENV not set"
    fi
    
    if [ -n "$SESSION_SECRET" ]; then
        log_info "SESSION_SECRET is set"
    else
        log_warn "SESSION_SECRET not set"
    fi
    
    if [ -n "$SITE_URL" ]; then
        log_info "SITE_URL is set to: $SITE_URL"
    else
        log_warn "SITE_URL not set"
    fi
else
    log_error ".env file missing"
fi

# Check 5: Node.js and npm
log_check "Node.js version"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_info "Node.js version: $NODE_VERSION"
else
    log_error "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    log_info "npm version: $NPM_VERSION"
else
    log_error "npm not found"
fi

# Check 6: Dependencies
log_check "Dependencies"
if [ -d "node_modules" ]; then
    log_info "node_modules directory exists"
    
    # Check key dependencies
    for dep in express sqlite3 bcryptjs; do
        if npm list "$dep" >/dev/null 2>&1; then
            log_info "$dep is installed"
        else
            log_warn "$dep is missing or not properly installed"
        fi
    done
else
    log_warn "node_modules directory missing - run 'npm install'"
fi

# Check 7: PM2 status
log_check "PM2 status"
if command -v pm2 >/dev/null 2>&1; then
    log_info "PM2 is installed"
    
    echo ""
    echo -e "${BLUE}PM2 Status:${NC}"
    pm2 status
    echo ""
    
    if pm2 status | grep -q "online"; then
        log_info "Application is running in PM2"
    else
        log_warn "Application is not running or has errors"
        echo ""
        echo -e "${YELLOW}Recent PM2 logs:${NC}"
        pm2 logs --lines 10 --nostream
    fi
else
    log_error "PM2 not found"
fi

# Check 8: Apache status
log_check "Apache status"
if sudo /opt/bitnami/ctlscript.sh status apache | grep -q "running"; then
    log_info "Apache is running"
else
    log_warn "Apache is not running"
fi

# Check 9: Port availability
log_check "Port 3000 availability"
if netstat -tuln | grep -q ":3000 "; then
    log_info "Port 3000 is in use (good)"
else
    log_warn "Port 3000 is not in use - application may not be running"
fi

# Check 10: Local connectivity
log_check "Local application response"
if curl -s http://localhost:3000 >/dev/null; then
    log_info "Application responds on localhost:3000"
else
    log_error "Application not responding on localhost:3000"
fi

# Check 11: File permissions
log_check "File permissions"
OWNER=$(stat -c '%U:%G' . 2>/dev/null || stat -f '%Su:%Sg' .)
if [ "$OWNER" = "bitnami:bitnami" ]; then
    log_info "Directory ownership is correct: $OWNER"
else
    log_warn "Directory ownership issue: $OWNER (should be bitnami:bitnami)"
    echo "Fix with: sudo chown -R bitnami:bitnami $PROJECT_DIR"
fi

# Check 12: Recent logs
echo ""
echo -e "${BLUE}📋 Recent Application Logs:${NC}"
echo "=================================="
if command -v pm2 >/dev/null 2>&1; then
    pm2 logs --lines 20 --nostream
else
    log_warn "PM2 not available - cannot show logs"
fi

# Summary and recommendations
echo ""
echo -e "${BLUE}📝 Summary and Recommendations:${NC}"
echo "=================================="

if [ ! -f ".env" ]; then
    echo "• Create .env file with proper configuration"
fi

if ! pm2 status | grep -q "online"; then
    echo "• Start the application: pm2 start ecosystem.config.js"
fi

if [ ! -d "node_modules" ]; then
    echo "• Install dependencies: npm install"
fi

if [ ! -f "snippets.db" ] || [ ! -f "sessions.db" ]; then
    echo "• Initialize databases: node migrations/001_add_users.js"
fi

echo ""
echo -e "${BLUE}🛠️  Quick Fix Commands:${NC}"
echo "=================================="
echo "# Fix permissions:"
echo "sudo chown -R bitnami:bitnami $PROJECT_DIR"
echo "chmod 664 *.db"
echo ""
echo "# Restart application:"
echo "pm2 restart all"
echo ""
echo "# Restart Apache:"
echo "sudo /opt/bitnami/ctlscript.sh restart apache"
echo ""
echo "# View logs:"
echo "pm2 logs"
echo ""
echo "# Test locally:"
echo "curl http://localhost:3000"