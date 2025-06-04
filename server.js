const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.get('/snippets', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM snippets';
  let params = [];
  let conditions = [];

  if (search) {
    conditions.push('(description LIKE ? OR css_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/snippets', (req, res) => {
  const { description, category, css_code } = req.body;

  if (!description || !category || !css_code) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (description.length > 250) {
    return res.status(400).json({ error: 'Description must be 250 characters or less' });
  }

  // Validate category exists in database
  db.get('SELECT name FROM categories WHERE name = ?', [category], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Insert snippet if category is valid
    insertSnippet();
  });
  
  function insertSnippet() {

    db.run(
      'INSERT INTO snippets (description, category, css_code) VALUES (?, ?, ?)',
      [description, category, css_code],
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
          created_at: new Date().toISOString()
        });
      }
    );
  }
});

// Get all categories
app.get('/categories', (req, res) => {
  db.all('SELECT name FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.name));
  });
});

// Add new category
app.post('/categories', (req, res) => {
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

// Delete category
app.delete('/categories/:name', (req, res) => {
  const { name } = req.params;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  // Check if category has any snippets
  db.get('SELECT COUNT(*) as count FROM snippets WHERE category = ?', [name], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category "${name}" because it contains ${result.count} snippet(s). Please move or delete those snippets first.` 
      });
    }
    
    // Delete the category if no snippets use it
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

// Update snippet
app.put('/snippets/:id', (req, res) => {
  const { id } = req.params;
  const { description, category, css_code } = req.body;

  if (!description || !category || !css_code) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (description.length > 250) {
    return res.status(400).json({ error: 'Description must be 250 characters or less' });
  }

  // Validate category exists in database
  db.get('SELECT name FROM categories WHERE name = ?', [category], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Update snippet if category is valid
    updateSnippet();
  });
  
  function updateSnippet() {
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
        
        // Return the updated snippet
        db.get('SELECT * FROM snippets WHERE id = ?', [id], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json(row);
        });
      }
    );
  }
});

// Delete snippet
app.delete('/snippets/:id', (req, res) => {
  const { id } = req.params;
  
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