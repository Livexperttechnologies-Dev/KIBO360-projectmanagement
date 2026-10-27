// ==============================================================================
// KIBO360 Project Hub — PM2 Production Process Manager Ecosystem
// Livexpert Technologies Pvt. Ltd.
// ==============================================================================

module.exports = {
  apps: [
    {
      name: "kibo360-backend",
      script: "dist/src/index.js",
      cwd: "./",
      // Keep one process until every runtime read is served directly from PostgreSQL.
      // This also ensures the in-process scheduler is started only once.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      kill_timeout: 5000,
      listen_timeout: 8000,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/pm2-backend-error.log",
      out_file: "logs/pm2-backend-out.log",
      merge_logs: true,
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
