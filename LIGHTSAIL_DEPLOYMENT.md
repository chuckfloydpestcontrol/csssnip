# AWS Lightsail Deployment Guide for CBO CSS Snips

This guide covers both fresh installations and updates to existing deployments on AWS Lightsail using Bitnami Node.js stack.

## Prerequisites

- AWS Lightsail instance with Bitnami Node.js stack
- Existing `snippets.db` and `sessions.db` (for updates)
- Domain pointing to your Lightsail instance (optional)

## Initial Setup (Fresh Installation)

### 1. Create Lightsail Instance

1. Go to AWS Lightsail Console
2. Create Instance → Platform: Linux/Unix → Blueprint: Node.js (Bitnami)
3. Choose the $5/month plan (512MB RAM is sufficient)
4. Name your instance and create it

### 2. Connect to Your Instance

Use the browser-based SSH or download the SSH key:

```bash
ssh -i ~/path-to-key.pem bitnami@your-instance-ip
```

### 3. Initial Server Setup

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y build-essential python3

# Create project directory
cd /opt/bitnami
sudo mkdir -p projects/csssnip
sudo chown -R bitnami:bitnami projects/
cd projects/csssnip
```

## Updating Existing Installation

If you already have the app running with existing databases, follow these steps:

### 1. Backup Your Data

```bash
cd /opt/bitnami/projects/csssnip

# Create backup directory
mkdir -p ~/backups/$(date +%Y%m%d)

# Backup databases
cp snippets.db ~/backups/$(date +%Y%m%d)/
cp sessions.db ~/backups/$(date +%Y%m%d)/

# Backup .env file if exists
cp .env ~/backups/$(date +%Y%m%d)/ 2>/dev/null || true
```

### 2. Stop the Application

```bash
# If using PM2
pm2 stop all
pm2 delete all

# If running directly
# Find and kill the node process
ps aux | grep node
# kill -9 [PID]
```

### 3. Update the Code

```bash
# If using git
git fetch origin
git pull origin main

# Or download the latest code
# Remove old code (except databases and .env)
mv snippets.db ~/temp_snippets.db
mv sessions.db ~/temp_sessions.db
mv .env ~/temp_env 2>/dev/null || true
rm -rf *
rm -rf .*

# Download new code (replace with your repository URL)
git clone https://github.com/yourusername/csssnip.git .
# Or upload files via SFTP

# Restore databases and .env
mv ~/temp_snippets.db ./snippets.db
mv ~/temp_sessions.db ./sessions.db
mv ~/temp_env ./.env 2>/dev/null || true
```

### 4. Set Up Environment Variables

```bash
# Create or update .env file
cat > .env << 'EOF'
# Required for production
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-random-secret-here-$(openssl rand -hex 32)

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=CBO CSS Snips <noreply@cbosnip.com>

# Site Configuration
SITE_URL=https://your-domain.com
EOF

# Edit the file to add your actual values
nano .env
```

### 5. Install Dependencies

```bash
# Remove old node_modules and package-lock
rm -rf node_modules package-lock.json

# Install dependencies
npm cache clean --force
npm install

# If sqlite3 fails, build from source
npm install --build-from-source sqlite3
```

### 6. Set Correct Permissions

```bash
# Set ownership
sudo chown -R bitnami:bitnami /opt/bitnami/projects/csssnip

# Set file permissions
find /opt/bitnami/projects/csssnip -type f -exec chmod 644 {} \;
find /opt/bitnami/projects/csssnip -type d -exec chmod 755 {} \;

# Make scripts executable
chmod +x deploy.sh fix-sqlite.sh 2>/dev/null || true

# Set database permissions
chmod 664 snippets.db
chmod 664 sessions.db

# Ensure the bitnami user can write to databases
chown bitnami:bitnami snippets.db sessions.db
```

### 7. Configure Apache (Bitnami)

```bash
# Create Apache configuration for reverse proxy
sudo nano /opt/bitnami/apache/conf/vhosts/csssnip-vhost.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # Redirect HTTP to HTTPS (if using SSL)
    # RewriteEngine On
    # RewriteCond %{HTTPS} off
    # RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
    
    ProxyRequests Off
    ProxyPreserveHost On
    
    <Proxy *>
        Require all granted
    </Proxy>
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Important headers for sessions
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    SSLEngine on
    SSLCertificateFile /opt/bitnami/apache/conf/bitnami/certs/server.crt
    SSLCertificateKeyFile /opt/bitnami/apache/conf/bitnami/certs/server.key
    
    ProxyRequests Off
    ProxyPreserveHost On
    
    <Proxy *>
        Require all granted
    </Proxy>
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Important headers for sessions with HTTPS
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

### 8. Enable Apache Modules and Restart

```bash
# Enable required Apache modules
sudo /opt/bitnami/apache/bin/apachectl -t -D DUMP_MODULES | grep -E "proxy|headers|rewrite"

# If any modules are missing, enable them:
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod rewrite

# Test Apache configuration
sudo /opt/bitnami/apache/bin/apachectl configtest

# Restart Apache
sudo /opt/bitnami/ctlscript.sh restart apache
```

### 9. Install and Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup systemd
# Copy and run the command it outputs
```

### 10. Verify the Installation

```bash
# Check if the app is running
pm2 status

# Check logs
pm2 logs --lines 50

# Test locally
curl http://localhost:3000

# Check database accessibility
ls -la *.db

# Verify environment variables are loaded
pm2 env 0
```

## Troubleshooting

### Session/Login Issues

1. **Check environment variables:**
   ```bash
   pm2 env 0 | grep -E "NODE_ENV|SESSION_SECRET"
   ```

2. **Verify Apache headers:**
   ```bash
   # Enable Apache debug logging temporarily
   sudo nano /opt/bitnami/apache/conf/httpd.conf
   # Set: LogLevel debug
   
   # Check logs
   sudo tail -f /opt/bitnami/apache/logs/error_log
   ```

3. **Test with curl:**
   ```bash
   # Test login
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@cbosnip.com","password":"changeme123"}' \
     -c cookies.txt -v
   
   # Check session
   curl http://localhost:3000/auth/me -b cookies.txt -v
   ```

### Database Permission Issues

```bash
# Fix ownership
sudo chown bitnami:bitnami *.db

# Fix permissions
chmod 664 *.db

# Check if databases are accessible
sqlite3 snippets.db ".tables"
sqlite3 sessions.db ".tables"
```

### SQLite3 Module Issues

```bash
# Rebuild sqlite3
npm rebuild sqlite3

# If that fails, remove and reinstall
npm uninstall sqlite3
npm install sqlite3 --build-from-source
```

### PM2 Issues

```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js

# Check for errors
pm2 logs --err --lines 100
```

## SSL Certificate Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-apache

# Stop Apache temporarily
sudo /opt/bitnami/ctlscript.sh stop apache

# Get certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Update Apache configuration to use the new certificates
# Edit /opt/bitnami/apache/conf/vhosts/csssnip-vhost.conf
# Update SSLCertificateFile and SSLCertificateKeyFile paths

# Start Apache
sudo /opt/bitnami/ctlscript.sh start apache

# Set up auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --pre-hook "/opt/bitnami/ctlscript.sh stop apache" --post-hook "/opt/bitnami/ctlscript.sh start apache"
```

## Monitoring and Maintenance

### Set up PM2 monitoring:

```bash
# Monitor resources
pm2 monit

# Set up log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Regular backups:

```bash
# Create backup script
cat > ~/backup-csssnip.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

cd /opt/bitnami/projects/csssnip
cp snippets.db $BACKUP_DIR/
cp sessions.db $BACKUP_DIR/
cp .env $BACKUP_DIR/

echo "Backup completed to $BACKUP_DIR"

# Delete backups older than 30 days
find ~/backups -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true
EOF

chmod +x ~/backup-csssnip.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/bitnami/backup-csssnip.sh") | crontab -
```

## Important Notes

1. **Always backup before updates** - Both databases contain critical data
2. **Test locally first** - Run the updated code locally before deploying
3. **Monitor after deployment** - Watch PM2 logs for any errors
4. **Keep .env secure** - Never commit it to version control
5. **Regular updates** - Keep Node.js and dependencies updated for security

## Quick Commands Reference

```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop all

# Restart application
pm2 restart all

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart Apache
sudo /opt/bitnami/ctlscript.sh restart apache

# Check Apache config
sudo /opt/bitnami/apache/bin/apachectl configtest
```

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs --err`
2. Check Apache logs: `sudo tail -f /opt/bitnami/apache/logs/error_log`
3. Verify permissions: `ls -la`
4. Test endpoints with curl
5. Check environment variables: `pm2 env 0`