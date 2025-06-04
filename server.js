require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { requireAuth, requireSuperUser, generateToken } = require('./middleware/auth');
const emailService = require('./services/email');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

const db = new sqlite3.Database('./snippets.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    css_code TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Auth endpoints
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.isSuperUser = user.is_super_user === 1;

    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      id: user.id,
      email: user.email,
      isSuperUser: user.is_super_user === 1
    });
  });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/auth/me', requireAuth, (req, res) => {
  db.get('SELECT id, email, is_super_user FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      isSuperUser: user.is_super_user === 1
    });
  });
});

// User management endpoints (super user only)
app.get('/users', requireSuperUser, (req, res) => {
  db.all('SELECT id, email, is_super_user, created_at, last_login FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(users);
  });
});

app.post('/users', requireSuperUser, async (req, res) => {
  const { email, password, isSuperUser } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (email, password, is_super_user) VALUES (?, ?, ?)',
    [email, hashedPassword, isSuperUser ? 1 : 0],
    async function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      try {
        await emailService.sendWelcomeEmail(email, password);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      res.json({
        id: this.lastID,
        email,
        isSuperUser: isSuperUser || false
      });
    }
  );
});

app.delete('/users/:id', requireSuperUser, (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.session.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

// Password change endpoints
app.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: 'Password changed successfully' });
    });
  });
});

// Admin password reset (super user only)
app.post('/users/:id/reset-password', requireSuperUser, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user email for sending notification
    db.get('SELECT email FROM users WHERE id = ?', [id], async (err, user) => {
      if (!err && user) {
        try {
          await emailService.sendPasswordResetNotification(user.email, newPassword);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
        }
      }
    });

    res.json({ message: 'Password reset successfully' });
  });
});

// Snippets endpoints (updated with auth)
app.get('/snippets', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT s.*, u.email as author_email FROM snippets s LEFT JOIN users u ON s.user_id = u.id';
  let params = [];
  let conditions = [];

  if (search) {
    conditions.push('(s.description LIKE ? OR s.css_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    conditions.push('s.category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY s.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/snippets', requireAuth, (req, res) => {
  const { description, category, css_code } = req.body;

  if (!description || !category || !css_code) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (description.length > 250) {
    return res.status(400).json({ error: 'Description must be 250 characters or less' });
  }

  db.get('SELECT name FROM categories WHERE name = ?', [category], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    db.run(
      'INSERT INTO snippets (description, category, css_code, user_id) VALUES (?, ?, ?, ?)',
      [description, category, css_code, req.session.userId],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({
          id: this.lastID,
          description,
          category,
          css_code,
          user_id: req.session.userId,
          created_at: new Date().toISOString()
        });
      }
    );
  });
});

app.put('/snippets/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { description, category, css_code } = req.body;

  if (!description || !category || !css_code) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (description.length > 250) {
    return res.status(400).json({ error: 'Description must be 250 characters or less' });
  }

  // Check if user owns the snippet or is super user
  db.get('SELECT user_id FROM snippets WHERE id = ?', [id], (err, snippet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    if (snippet.user_id !== req.session.userId && !req.session.isSuperUser) {
      return res.status(403).json({ error: 'You do not have permission to edit this snippet' });
    }

    db.get('SELECT name FROM categories WHERE name = ?', [category], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      
      db.run(
        'UPDATE snippets SET description = ?, category = ?, css_code = ? WHERE id = ?',
        [description, category, css_code, id],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          if (this.changes === 0) {
            res.status(404).json({ error: 'Snippet not found' });
            return;
          }
          
          db.get('SELECT s.*, u.email as author_email FROM snippets s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?', [id], (err, row) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json(row);
          });
        }
      );
    });
  });
});

app.delete('/snippets/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  // Check if user owns the snippet or is super user
  db.get('SELECT user_id FROM snippets WHERE id = ?', [id], (err, snippet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' });
    }

    if (snippet.user_id !== req.session.userId && !req.session.isSuperUser) {
      return res.status(403).json({ error: 'You do not have permission to delete this snippet' });
    }

    db.run('DELETE FROM snippets WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Snippet not found' });
      }
      
      res.json({ message: 'Snippet deleted successfully' });
    });
  });
});

// Categories endpoints
app.get('/categories', (req, res) => {
  db.all('SELECT name FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.name));
  });
});

app.post('/categories', requireAuth, (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length > 50) {
    return res.status(400).json({ error: 'Category name must be 50 characters or less' });
  }
  
  db.run('INSERT INTO categories (name) VALUES (?)', [trimmedName], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Category already exists' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ name: trimmedName });
  });
});

app.delete('/categories/:name', requireSuperUser, (req, res) => {
  const { name } = req.params;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  db.get('SELECT COUNT(*) as count FROM snippets WHERE category = ?', [name], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category "${name}" because it contains ${result.count} snippet(s). Please move or delete those snippets first.` 
      });
    }
    
    db.run('DELETE FROM categories WHERE name = ?', [name], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json({ message: `Category "${name}" deleted successfully` });
    });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});