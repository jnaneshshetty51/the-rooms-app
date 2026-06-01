// The Rooms — PM2 Ecosystem Configuration
// Each app runs `next start` from its own directory.
// Port is passed via PORT env var (next start reads it automatically).

const ROOT = '/opt/therooms';

function app(name, appDir, port, nextauthUrl, extraEnv = {}) {
  return {
    name,
    cwd: `${ROOT}/${appDir}`,
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: nextauthUrl,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL,
      ...extraEnv,
    },
    error_file: `/var/log/therooms/${name}-error.log`,
    out_file: `/var/log/therooms/${name}-out.log`,
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '5s',
    max_memory_restart: '800M',
  };
}

module.exports = {
  apps: [
    app('rooms-web',          'apps/web',          3000, 'https://therooms.in', {
      IDFC_MERCHANT_ID:    process.env.IDFC_MERCHANT_ID,
      IDFC_API_KEY:        process.env.IDFC_API_KEY,
      IDFC_WEBHOOK_SECRET: process.env.IDFC_WEBHOOK_SECRET,
    }),
    app('rooms-guest',        'apps/guest-portal', 3001, 'https://my.therooms.in'),
    app('rooms-front-office', 'apps/front-office', 3002, 'https://fo.therooms.in'),
    app('rooms-admin',        'apps/admin',        3003, 'https://admin.therooms.in'),
    app('rooms-super-admin',  'apps/super-admin',  3004, 'https://superadmin.therooms.in'),
  ],
};
