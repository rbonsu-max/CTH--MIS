module.exports = {
  apps: [
    {
      name: 'cthmis-app',
      script: 'npm',
      args: 'run start',
      // We explicitly omit 'cwd' so PM2 uses the directory where the config file is located.
      // This prevents crashes if the folder is named 'snsportal', 'sns', or 'cthmis'.
      env: {
        NODE_ENV: 'production',
        PORT: 3009,
      },
      instances: 1, // SQLite doesn't support multiple concurrent writers safely
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log', // Relative path created inside the project folder
      out_file: 'logs/out.log',
      merge_logs: true,
    },
  ],
};
