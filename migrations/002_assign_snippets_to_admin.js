const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./snippets.db');

console.log('🔧 Assigning existing snippets to admin user...');

db.serialize(() => {
  // First, get the admin user ID
  db.get('SELECT id FROM users WHERE email = ?', ['admin@cbosnip.com'], (err, adminUser) => {
    if (err) {
      console.error('❌ Error finding admin user:', err);
      process.exit(1);
    }
    
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run 001_add_users.js first.');
      process.exit(1);
    }
    
    const adminId = adminUser.id;
    console.log(`✅ Found admin user with ID: ${adminId}`);
    
    // Count snippets without user_id
    db.get('SELECT COUNT(*) as count FROM snippets WHERE user_id IS NULL', (err, result) => {
      if (err) {
        console.error('❌ Error counting snippets:', err);
        process.exit(1);
      }
      
      console.log(`📊 Found ${result.count} snippets without user assignment`);
      
      if (result.count === 0) {
        console.log('✅ All snippets already have user assignments');
        process.exit(0);
      }
      
      // Update snippets to assign them to admin
      db.run('UPDATE snippets SET user_id = ? WHERE user_id IS NULL', [adminId], function(err) {
        if (err) {
          console.error('❌ Error updating snippets:', err);
          process.exit(1);
        }
        
        console.log(`✅ Successfully assigned ${this.changes} snippets to admin user`);
        
        // Verify the update
        db.all(`
          SELECT s.id, s.description, u.email as author_email 
          FROM snippets s 
          LEFT JOIN users u ON s.user_id = u.id 
          LIMIT 3
        `, (err, samples) => {
          if (err) {
            console.error('❌ Error verifying update:', err);
            process.exit(1);
          }
          
          console.log('📋 Sample snippets after update:');
          samples.forEach(snippet => {
            console.log(`  - "${snippet.description}" by ${snippet.author_email}`);
          });
          
          console.log('🎉 Migration completed successfully!');
          process.exit(0);
        });
      });
    });
  });
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});