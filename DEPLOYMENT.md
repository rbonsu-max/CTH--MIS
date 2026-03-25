# CTHMIS — Deployment Guide (Contabo VPS + aaPanel)

## Prerequisites

- **Ubuntu 22.04+** on your Contabo VPS
- **aaPanel** installed and configured
- **Node.js 18+ / 20+** via aaPanel App Store
- **PM2** (`npm install -g pm2`)

---

## 1. Upload the Application

```bash
# On the VPS, create the project directory
mkdir -p /www/wwwroot/cthmis

# Upload your project files (from your local machine)
rsync -avz --exclude node_modules --exclude .env --exclude '*.db' ./ root@YOUR_VPS_IP:/www/wwwroot/cthmis/
```

> Or use aaPanel's File Manager to upload a .zip archive.

---

## 2. Install Dependencies

```bash
cd /www/wwwroot/cthmis
npm install --production=false  # Need devDeps for tsx & vite build
```

---

## 3. Build the Frontend

```bash
npm run build
```

This compiles the React frontend into `/www/wwwroot/cthmis/dist/`.

---

## 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required changes:**
| Variable      | Description                                        |
| ------------- | -------------------------------------------------- |
| `NODE_ENV`    | Set to `production`                                |
| `PORT`        | `3009` (or your preferred port)                    |
| `JWT_SECRET`  | A long random string (32+ chars). Generate with: `openssl rand -base64 32` |
| `DB_PATH`     | `/www/wwwroot/cthmis/sims.db`                      |
| `APP_URL`     | Your domain, e.g. `https://sims.yourdomain.com`    |

---

## 5. Start with PM2

```bash
cd /www/wwwroot/cthmis
s
pm2 save
pm2 startup  # follow the output instructions to enable auto-start on reboot
```

**Useful PM2 commands:**
```bash
pm2 logs cthmis       # view logs
pm2 restart cthmis    # restart the app
pm2 stop cthmis       # stop the app
pm2 status            # see all processes
```

---

## 6. Configure Nginx Reverse Proxy (via aaPanel)

1. Go to **aaPanel → Website → Node Project** or **Website → Add Site**
2. Set your domain name (e.g. `sims.yourdomain.com`)
3. Add a **Reverse Proxy** with these settings:

| Setting          | Value                        |
| ---------------- | ---------------------------- |
| Proxy Name       | `cthmis`                     |
| Target URL       | `http://127.0.0.1:3009`     |
| Send Domain      | `$host`                      |

Or manually add to the Nginx config:

```nginx
location / {
    proxy_pass http://127.0.0.1:3009;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}
```

---

## 7. Enable SSL (Recommended)

1. In aaPanel, go to **Website → your domain → SSL**
2. Click **Let's Encrypt** → Issue certificate
3. Enable **Force HTTPS**

---

## 8. Firewall

Ensure port `3009` is **NOT** exposed publicly (Nginx proxies it):

```bash
# aaPanel Security → Firewall — only allow 80, 443, 22
ufw allow 80
ufw allow 443
ufw allow 22
ufw deny 3009
ufw enable
```

---

## 9. Database Backup (Cron)

Set up a daily SQLite backup via aaPanel → Cron:

```bash
# Daily backup at 2 AM
0 2 * * * cp /www/wwwroot/cthmis/sims.db /www/backup/cthmis/sims_$(date +\%Y\%m\%d).db
```

---

## Default Login

| Username | Password   | Role       |
| -------- | ---------- | ---------- |
| `admin`  | `admin123` | SuperAdmin |

> **⚠️ Change this password immediately after first login!**

---

## Troubleshooting

| Issue                        | Fix                                                                 |
| ---------------------------- | ------------------------------------------------------------------- |
| App won't start              | Check `pm2 logs cthmis` for errors                                  |
| 502 Bad Gateway              | Ensure PM2 process is running: `pm2 status`                         |
| Login doesn't work           | Check if `JWT_SECRET` is set in `.env`                              |
| Database locked errors       | Ensure only one PM2 instance (fork mode, not cluster)               |
| Cookies not working          | Ensure `NODE_ENV=production` and SSL is enabled                     |
| Port already in use          | Change `PORT` in `.env` or stop the conflicting process             |

---

## 10. SQLite Admin Dashboard (`server-admin.js`)

The application includes a detached, lightweight SQLite Admin Dashboard for direct database management. This is extremely useful for a production environment where you cannot easily download the `.db` file.

### How to Run in Production (aaPanel / PM2)
You can deploy it as a separate PM2 process.

1. Navigate to your project directory.
2. Run the admin server using PM2, passing the required environment variables:
```bash
ADMIN_USER=your_secure_user ADMIN_PASS=your_secure_password ADMIN_PORT=7070 DB_PATH=/www/wwwroot/cthmis/sims.db pm2 start server-admin.js --name "cthmis-admin"
pm2 save
```

### Accessing the Dashboard
- **URL**: `http://YOUR_VPS_IP:7070`
- **Login**: When prompted by your browser, enter the `ADMIN_USER` and `ADMIN_PASS` you configured above.
- **Firewall**: Ensure port `7070` is open in aaPanel's security settings so you can access it externally, or set up a secondary reverse proxy (e.g., `dbadmin.yourdomain.com -> 127.0.0.1:7070`).
