#!/bin/bash

echo "Fixing SQLite3 installation..."

# Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install

# Rebuild sqlite3 specifically for your system
npm rebuild sqlite3

echo "SQLite3 fix complete! You can now run 'npm start'"