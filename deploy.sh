#!/bin/bash

# Deployment script for CSS Snippet Vault on Ubuntu EC2

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install application dependencies
npm install

# Set up PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/css-snippet-vault
sudo ln -sf /etc/nginx/sites-available/css-snippet-vault /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Set up firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "Deployment complete! Your application should be running on port 80."
echo "Make sure to:"
echo "1. Replace 'your-domain.com' in nginx.conf with your actual domain/IP"
echo "2. Configure your security group to allow HTTP (port 80) traffic"
echo "3. Consider setting up SSL with Let's Encrypt for HTTPS"