const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./snippets.db');

async function migrate() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Create users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_super_user BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }
        console.log('Users table created successfully');
      });

      // Add user_id to snippets table
      db.run(`ALTER TABLE snippets ADD COLUMN user_id INTEGER REFERENCES users(id)`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding user_id to snippets:', err);
          reject(err);
          return;
        }
        console.log('Added user_id column to snippets table');
      });

      // Create password reset tokens table
      db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating password_reset_tokens table:', err);
          reject(err);
          return;
        }
        console.log('Password reset tokens table created successfully');
      });

      // Create sessions table (for persistent sessions)
      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expired DATETIME NOT NULL
      )`, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err);
          reject(err);
          return;
        }
        console.log('Sessions table created successfully');
      });

      // Create a default super user
      const defaultEmail = 'admin@cbosnip.com';
      const defaultPassword = 'changeme123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      db.get('SELECT id FROM users WHERE email = ?', [defaultEmail], (err, row) => {
        if (err) {
          console.error('Error checking for default user:', err);
          reject(err);
          return;
        }

        if (!row) {
          db.run(
            'INSERT INTO users (email, password, is_super_user) VALUES (?, ?, ?)',
            [defaultEmail, hashedPassword, 1],
            (err) => {
              if (err) {
                console.error('Error creating default super user:', err);
                reject(err);
                return;
              }
              console.log(`Default super user created: ${defaultEmail} (password: ${defaultPassword})`);
              console.log('IMPORTANT: Change this password immediately!');
              resolve();
            }
          );
        } else {
          console.log('Default super user already exists');
          resolve();
        }
      });
    });
  });
}

migrate()
  .then(() => {
    console.log('Migration completed successfully');
    db.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  });