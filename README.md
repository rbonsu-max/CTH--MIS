# CTHMIS - Production Deployment

This application is ready for production deployment on your Ubuntu VPS.

## Prerequisites
- aaPanel installed on your Ubuntu VPS.
- Node.js (v20 or higher) installed via aaPanel's Node.js Version Manager.
- PM2 Manager installed via aaPanel App Store.

## Deployment Steps

### 1. Upload Files
Upload all files (excluding `node_modules` and `dist`) to your website's root directory (e.g., `/www/wwwroot/your-site`).

### 2. Install Dependencies
Open the terminal in aaPanel and run: 
```bash
npm install
```

### 3. Build the Frontend
Run: 
```bash
npm run build
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (copy from `.env.example`):
```env
JWT_SECRET=your_very_secure_random_secret
PORT=3006
DATABASE_PATH=./data/database.sqlite
NODE_ENV=production
```

### 5. Set up PM2
In aaPanel's Node.js Manager, add a new project:
- **Project Path**: `/www/wwwroot/your-site`
- **Startup File**: `server.ts`
- **Run Command**: `tsx server.ts` (or use the start script from package.json)
- **Port**: `3006`

### 6. Reverse Proxy
In aaPanel's Website Settings, go to Reverse Proxy and add a new proxy:
- **Proxy Name**: backend
- **Target URL**: `http://127.0.0.1:3006`

### 7. Permissions
Ensure the `data` and `uploads` directories are writable by the `www` user.

## Database
The application uses SQLite as requested. The database file will be created automatically at the path specified in `DATABASE_PATH`.
