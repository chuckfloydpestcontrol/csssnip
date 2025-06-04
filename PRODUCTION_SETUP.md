# Production Setup Checklist

## Environment Variables

Make sure to set these environment variables on your production server:

```bash
# Required for production
NODE_ENV=production
SESSION_SECRET=your-random-secret-here-change-this
PORT=3000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=CBO CSS Snips <noreply@cbosnip.com>

# Site Configuration
SITE_URL=https://cbosnip.com
```

## Nginx Configuration

If using Nginx as a reverse proxy, ensure it forwards the necessary headers:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Important for sessions
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Apache Configuration (for Lightsail)

If using Apache on Lightsail:

```apache
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Port "443"
```

## SSL/HTTPS Setup

1. **Ensure HTTPS is enabled** - Sessions won't work properly without it in production
2. **Update your .env file** with `NODE_ENV=production`
3. **Set a strong SESSION_SECRET** - Use a random string generator

## Database Setup

1. Run the migration on your production server:
   ```bash
   node migrations/001_add_users.js
   ```

2. Ensure proper file permissions:
   ```bash
   chmod 664 snippets.db
   chmod 664 sessions.db
   ```

## Testing Production Login

1. **Clear all cookies** for your domain
2. **Check browser console** for any errors
3. **Check server logs** for session-related errors:
   ```bash
   pm2 logs
   ```

## Common Production Issues

### Sessions Not Persisting
- Check that `NODE_ENV=production` is set
- Verify HTTPS is working (check for padlock in browser)
- Ensure proxy headers are being forwarded correctly
- Check that sessions.db has write permissions

### Cookie Not Being Set
- Verify domain matches (www vs non-www)
- Check browser developer tools → Application → Cookies
- Ensure no JavaScript errors in console

### Authentication Redirects
- Clear browser cache and cookies
- Check that all requests use HTTPS
- Verify session secret is the same across all instances

## PM2 Configuration

Make sure your `ecosystem.config.js` includes environment variables:

```javascript
module.exports = {
  apps: [{
    name: 'css-snippet-vault',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

## Debugging Commands

```bash
# Check if sessions are being created
sqlite3 sessions.db "SELECT COUNT(*) FROM sessions;"

# View recent sessions
sqlite3 sessions.db "SELECT sid, datetime(expired, 'unixepoch') FROM sessions ORDER BY expired DESC LIMIT 5;"

# Check PM2 logs
pm2 logs --lines 50

# Test login via curl
curl -X POST https://cbosnip.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cbosnip.com","password":"changeme123"}' \
  -c cookies.txt -v
```