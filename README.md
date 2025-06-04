# CBO CSS Snips

A simple web application for storing and discovering CSS code snippets. Users can submit CSS snippets with descriptions and categories, then search and filter through the collection.

## Features

- **Snippet Submission**: Add CSS snippets with description (max 250 chars), category, and code
- **Custom Categories**: Create and manage your own categories
- **Edit Snippets**: Modify description, category, and code of existing snippets
- **Delete Snippets**: Remove snippets with confirmation dialog
- **Copy to Clipboard**: One-click copy button for each CSS snippet
- **Category Management**: Add new categories and delete unused ones
- **Search**: Filter snippets by description or CSS code content
- **Category Filtering**: View snippets by specific category
- **IDE-like Editor**: CodeMirror integration with syntax highlighting, line numbers, and auto-completion
- **Collapsible Forms**: Hide/show the add snippet form to save space
- **Responsive Design**: Clean, mobile-friendly interface using Tailwind CSS

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: SQLite
- **Frontend**: HTML, CSS (Tailwind), Vanilla JavaScript
- **Code Editor**: CodeMirror with CSS syntax highlighting
- **Syntax Highlighting**: Prism.js for display

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the application**:
   ```bash
   npm start
   ```

3. **Access the app**: Open http://localhost:3000 in your browser

## API Endpoints

### Snippets
- `GET /snippets` - Retrieve all snippets (supports query parameters)
  - `?search=hover` - Search in description and CSS code
  - `?category=Layout` - Filter by category
- `POST /snippets` - Add a new snippet
  - Body: `{ "description": "...", "category": "...", "css_code": "..." }`
- `PUT /snippets/:id` - Update an existing snippet
  - Body: `{ "description": "...", "category": "...", "css_code": "..." }`

### Categories
- `GET /categories` - Retrieve all categories
- `POST /categories` - Add a new category
  - Body: `{ "name": "..." }`
- `DELETE /categories/:name` - Delete a category (only if no snippets use it)

## Deployment Options

### Option 1: Ubuntu EC2 (Traditional Server)

1. **Upload files** to your EC2 instance
2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```
3. **Update nginx config** with your domain/IP:
   - Edit `/etc/nginx/sites-available/css-snippet-vault`
   - Replace `your-domain.com` with your actual domain or IP address
4. **Restart nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

### Option 2: AWS Lightsail (Recommended for Simplicity)

1. **Create Lightsail Instance**:
   - Go to AWS Lightsail Console
   - Create Instance → Platform: Linux/Unix → Blueprint: Node.js
   - Choose $5/month plan (512MB RAM)

2. **Deploy your application**:
   ```bash
   # SSH into Lightsail (use browser SSH or download key)
   cd /opt/bitnami/
   sudo mkdir projects
   cd projects
   
   # Upload your code (use file manager or git)
   git clone https://github.com/chuckfloydpestcontrol/csssnip.git
   cd csssnip
   
   # Install dependencies and start
   sudo npm install
   
   # If sqlite3 errors occur on Lightsail/EC2:
   sudo npm install --build-from-source sqlite3
   
   sudo npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

3. **Configure Apache Proxy**:
   ```bash
   sudo nano /opt/bitnami/apache/conf/bitnami/bitnami-apps-prefix.conf
   ```
   Add this line:
   ```apache
   ProxyPass /app http://localhost:3000/
   ProxyPassReverse /app http://localhost:3000/
   ```
   
   ```bash
   sudo /opt/bitnami/ctlscript.sh restart apache
   ```

4. **Set up Domain** (Optional):
   - Lightsail Console → Networking → DNS Zones
   - Create DNS zone for your domain
   - Update nameservers at your registrar
   - Add A record: @ → your Lightsail IP

5. **Access your app**: 
   - Via IP: `http://your-lightsail-ip/app`
   - Via domain: `http://yourdomain.com/app`

**Cost**: $5/month fixed price + domain cost (~$12/year)

## File Structure

```
cbo-css-snips/
├── server.js              # Express server
├── package.json           # Dependencies
├── ecosystem.config.js    # PM2 configuration
├── nginx.conf            # Nginx configuration
├── deploy.sh             # Deployment script
├── snippets.db           # SQLite database (created automatically)
└── public/
    ├── index.html        # Frontend HTML
    └── app.js           # Frontend JavaScript
```

## Database Schema

```sql
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    css_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
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

This rebuilds sqlite3 for your specific system architecture.

## Security Considerations

- Input validation on both client and server
- SQL injection protection using parameterized queries
- XSS prevention through HTML escaping
- CORS enabled for frontend-backend communication

## License

MIT