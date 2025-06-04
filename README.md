# CBO CSS Snips

A secure web application for storing and discovering CSS code snippets with user authentication and role-based permissions. Users can submit CSS snippets with descriptions and categories, then search and filter through the collection.

## Features

### Core Functionality
- **Snippet Management**: Add, edit, and delete CSS snippets with descriptions and categories
- **Custom Categories**: Create and manage your own categories
- **Search & Filter**: Filter snippets by description, CSS code content, or category
- **Copy to Clipboard**: One-click copy button for each CSS snippet
- **IDE-like Editor**: CodeMirror integration with syntax highlighting, line numbers, and auto-completion
- **Responsive Design**: Clean, mobile-friendly interface using Tailwind CSS

### Authentication & Security
- **User Authentication**: Secure login system with email and password
- **Role-Based Permissions**: Super Users and Regular Users with different capabilities
- **Session Management**: Persistent sessions with secure cookie handling
- **Password Management**: Users can change passwords, admins can reset passwords
- **Email Notifications**: Automated emails for new users and password resets

### User Types
- **Super Users**: Full administrative access including user management and category deletion
- **Regular Users**: Can manage their own snippets and add categories

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: SQLite with user authentication tables
- **Authentication**: bcrypt password hashing, express-session
- **Email**: Nodemailer for automated notifications
- **Frontend**: HTML, CSS (Tailwind), Vanilla JavaScript
- **Code Editor**: CodeMirror with CSS syntax highlighting
- **Syntax Highlighting**: Prism.js for display

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (create `.env` file):
   ```env
   PORT=3000
   SESSION_SECRET=your-session-secret-change-in-production
   
   # Email Configuration (for user notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=CBO CSS Snips <noreply@cbosnip.com>
   
   # Site Configuration
   SITE_URL=https://cbosnip.com
   ```

3. **Initialize database**:
   ```bash
   node migrations/001_add_users.js
   ```

4. **Run the application**:
   ```bash
   npm start
   ```

5. **Access the app**: Open http://localhost:3000 in your browser

6. **Login with default admin credentials**:
   - **Email**: admin@cbosnip.com
   - **Password**: changeme123
   - ⚠️ **Change this password immediately!**

## Authentication System

### Default Credentials
A default super user is created during database initialization:
- **Email**: admin@cbosnip.com
- **Password**: changeme123

### User Management
- **Login**: `/login.html` - User authentication
- **Admin Panel**: `/admin.html` - User management (super users only)
- **Password Change**: Available to all users via "Change Password" button
- **Password Reset**: Super users can reset any user's password

### Permissions
| Feature | Regular User | Super User |
|---------|-------------|------------|
| Add snippets | ✅ | ✅ |
| Edit own snippets | ✅ | ✅ |
| Edit any snippet | ❌ | ✅ |
| Delete own snippets | ✅ | ✅ |
| Delete any snippet | ❌ | ✅ |
| Add categories | ✅ | ✅ |
| Delete categories | ❌ | ✅ |
| User management | ❌ | ✅ |
| Password reset others | ❌ | ✅ |

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout current user
- `GET /auth/me` - Get current user info
- `POST /auth/change-password` - Change user's own password

### User Management (Super Users Only)
- `GET /users` - List all users
- `POST /users` - Create new user
- `DELETE /users/:id` - Delete user
- `POST /users/:id/reset-password` - Reset user's password

### Snippets (Authentication Required)
- `GET /snippets` - Retrieve all snippets (supports query parameters)
  - `?search=hover` - Search in description and CSS code
  - `?category=Layout` - Filter by category
- `POST /snippets` - Add a new snippet
  - Body: `{ "description": "...", "category": "...", "css_code": "..." }`
- `PUT /snippets/:id` - Update snippet (own snippets or super user)
  - Body: `{ "description": "...", "category": "...", "css_code": "..." }`
- `DELETE /snippets/:id` - Delete snippet (own snippets or super user)

### Categories (Authentication Required)
- `GET /categories` - Retrieve all categories
- `POST /categories` - Add a new category
  - Body: `{ "name": "..." }`
- `DELETE /categories/:name` - Delete category (super users only, no snippets using it)

## Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password
3. Use the app password in `EMAIL_PASS`

Example `.env` configuration:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=CBO CSS Snips <noreply@cbosnip.com>
```

## Deployment Options

### Option 1: AWS Lightsail with Bitnami (Recommended)

For detailed deployment and update instructions, see [LIGHTSAIL_DEPLOYMENT.md](LIGHTSAIL_DEPLOYMENT.md).

**Quick Overview:**
- Uses Bitnami Node.js stack on AWS Lightsail
- Includes Apache reverse proxy configuration
- Handles permissions and session issues
- Complete update guide for existing installations
- Cost: $5/month fixed price

### Option 2: Traditional VPS (Ubuntu/Nginx)

1. **Upload files** to your server
2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   nano .env  # Configure your settings
   ```
3. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```
4. **Configure Nginx** for reverse proxy
5. **Set up SSL** with Let's Encrypt

### Important Deployment Notes

1. **Environment Variables** - Always set `NODE_ENV=production` on your server
2. **Session Configuration** - HTTPS is required for secure cookies in production
3. **Database Permissions** - Ensure write permissions for `snippets.db` and `sessions.db`
4. **Proxy Headers** - Configure your reverse proxy to forward proper headers

For production issues, see [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md).

## File Structure

```
cbo-css-snips/
├── server.js                    # Express server with authentication
├── package.json                 # Dependencies
├── ecosystem.config.js          # PM2 configuration
├── nginx.conf                   # Nginx configuration
├── deploy.sh                    # Deployment script
├── .env                         # Environment variables (create from .env.example)
├── snippets.db                  # SQLite database (created automatically)
├── sessions.db                  # Session storage (created automatically)
├── migrations/
│   └── 001_add_users.js        # Database migration for user tables
├── middleware/
│   └── auth.js                 # Authentication middleware
├── services/
│   └── email.js                # Email service for notifications
└── public/
    ├── index.html              # Main application interface
    ├── login.html              # Login page
    ├── admin.html              # Admin panel (super users only)
    └── app.js                  # Frontend JavaScript
```

## Database Schema

```sql
-- User authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_super_user BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- CSS snippets with user ownership
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    css_code TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired DATETIME NOT NULL
);

-- Password reset tokens (for future use)
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### SQLite3 Errors
If you encounter sqlite3 binding errors, run the fix script:
```bash
./fix-sqlite.sh
```

Or manually fix:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm rebuild sqlite3
```

### Authentication Issues
- Ensure `.env` file is properly configured
- Check that the database migration has been run
- Verify email settings if password reset emails aren't working

### Permission Errors
- Regular users can only edit/delete their own snippets
- Only super users can access `/admin.html`
- Check browser console for authentication errors

## Security Features

- **Password Security**: bcrypt hashing with salt rounds
- **Session Security**: Secure session cookies with expiration
- **Input Validation**: Both client and server-side validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: HTML escaping and content sanitization
- **CORS Configuration**: Proper cross-origin request handling
- **Authorization**: Role-based access control
- **HTTPS Ready**: Secure cookie settings for production

## Production Security Checklist

- [ ] Change default admin password
- [ ] Update `SESSION_SECRET` in `.env`
- [ ] Configure proper email credentials
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS in production
- [ ] Regular database backups
- [ ] Monitor authentication logs

## License

MIT