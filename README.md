# CSS Snippet Vault

A simple web application for storing and discovering CSS code snippets. Users can submit CSS snippets with descriptions and categories, then search and filter through the collection.

## Features

- **Snippet Submission**: Add CSS snippets with description (max 250 chars), category, and code
- **Custom Categories**: Create and manage your own categories
- **Edit Snippets**: Modify description, category, and code of existing snippets
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

- `GET /snippets` - Retrieve all snippets (supports query parameters)
  - `?search=hover` - Search in description and CSS code
  - `?category=Layout` - Filter by category
- `POST /snippets` - Add a new snippet
  - Body: `{ "description": "...", "category": "...", "css_code": "..." }`

## Deployment on Ubuntu EC2

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

## File Structure

```
css-snippet-vault/
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
```

## Security Considerations

- Input validation on both client and server
- SQL injection protection using parameterized queries
- XSS prevention through HTML escaping
- CORS enabled for frontend-backend communication

## License

MIT