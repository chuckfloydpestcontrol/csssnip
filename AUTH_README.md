# Authentication Setup for CBO CSS Snips

## Overview
The application now includes username and password authentication with user management capabilities.

## Default Super User
A default super user has been created:
- **Email**: admin@cbosnip.com
- **Password**: changeme123

**IMPORTANT**: Change this password immediately after first login!

## Features

### User Types
1. **Super Users**
   - Can add new users
   - Can delete users
   - Can manage categories
   - Can edit/delete any snippet
   - Access to admin panel at `/admin.html`

2. **Regular Users**
   - Can add snippets
   - Can edit/delete their own snippets
   - Can add categories

### Authentication Flow
1. Users must log in at `/login.html`
2. Sessions persist for 7 days
3. All snippet operations require authentication
4. User permissions are enforced on both frontend and backend

### Password Management
1. **User Password Change**
   - All authenticated users can change their own password
   - Access via "Change Password" button in the main interface
   - Requires current password for verification
   - New password must be at least 6 characters

2. **Admin Password Reset**
   - Super users can reset any user's password
   - Access via "Reset Password" button in admin panel
   - Automatically sends email notification to the user
   - User should change password after receiving reset email

### Email Configuration
To enable email notifications for new users, update the `.env` file with your SMTP settings:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=CBO CSS Snips <noreply@cbosnip.com>
```

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use that password in `EMAIL_PASS`

### Security Notes
1. All passwords are hashed using bcrypt
2. Sessions are stored in SQLite
3. HTTPS should be used in production (set `NODE_ENV=production`)
4. Update the `SESSION_SECRET` in `.env` for production

### Database Changes
New tables added:
- `users` - Stores user accounts
- `sessions` - Manages user sessions
- `password_reset_tokens` - For future password reset functionality

The `snippets` table now includes a `user_id` field to track ownership.

### API Endpoints

#### Authentication
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout current user
- `GET /auth/me` - Get current user info
- `POST /auth/change-password` - Change user's own password

#### User Management (Super Users Only)
- `GET /users` - List all users
- `POST /users` - Create new user
- `DELETE /users/:id` - Delete user
- `POST /users/:id/reset-password` - Reset user's password

### Usage
1. Navigate to `https://cbosnip.com/login.html`
2. Login with the default super user credentials
3. Access the admin panel to add new users
4. New users will receive an email with their login credentials

### Testing
To test locally:
1. Start the server: `npm start`
2. Navigate to `http://localhost:3000/login.html`
3. Login with the default credentials
4. Test user management at `http://localhost:3000/admin.html`