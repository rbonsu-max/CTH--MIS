#!/bin/bash

# Exit on error
set -e

echo "Starting Deployment for CTHMIS (aaPanel)"

# 1. Pull latest code (if using git)
# git pull origin main

# 2. Install dependencies
echo "Installing dependencies..."
npm ci

# 3. Build frontend (Vite)
echo "Building frontend..."
npm run build

# 4. Restart PM2 Process Manager
echo "Restarting PM2 backend service..."
# Assuming PM2 is installed globally and manages 'cthmis'
pm2 restart cthmis || pm2 reload ecosystem.config.cjs

echo "Deployment complete! ✅"
