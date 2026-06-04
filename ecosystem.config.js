// The Rooms — PM2 Ecosystem Configuration
// Each app runs `next start` from its own directory.
// Port is passed via PORT env var (next start reads it automatically).

const ROOT = '/opt/therooms';

const H = 60 * 60;        // seconds per hour
const D = 24 * H;         // seconds per day

function app(name, appDir, port, nextauthUrl, extraEnv = {}) {
  return {
    name,
    cwd: `${ROOT}/${appDir}`,
    script: 'node_modules/next/dist/bin/next',
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
      // AUTH_TRUST_HOST=1 is the Auth.js v5 env var that allows the app to
      // trust X-Forwarded-Host from nginx. Fixes UntrustedHost 500 errors.
      AUTH_TRUST_HOST: '1',
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      // MinIO — hostname-only endPoint, port separate (minio SDK requirement)
      // MINIO_ROOT_USER / MINIO_ROOT_PASSWORD are the VPS env var names
      MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
      MINIO_PORT: process.env.MINIO_PORT || '9000',
      MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER,
      MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD,
      MINIO_BUCKET: process.env.MINIO_BUCKET || 'therooms-storage',
      // Public URL via nginx proxy — images served at https://admin.therooms.in/media/
      // Hardcoded because system env has wrong localhost value from docker-compose
      MINIO_PUBLIC_URL: 'https://admin.therooms.in/media',
      MINIO_USE_SSL: 'false',
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
    // ── Public website — no session auth needed, short-lived tokens only ──
    app('rooms-web', 'apps/web', 3005, 'https://therooms.in', {
      NEXTAUTH_COOKIE_NAME:       'therooms.web.session',
      NEXTAUTH_SESSION_MAX_AGE:   String(D),          // 24 h
      RAZORPAY_KEY_ID:                process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET:            process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET:        process.env.RAZORPAY_WEBHOOK_SECRET,
    }),
    // ── Guest portal — stays logged in for 30 days ──
    app('rooms-guest', 'apps/guest-portal', 3001, 'https://my.therooms.in', {
      NEXTAUTH_COOKIE_NAME:       'therooms.guest.session',
      NEXTAUTH_SESSION_MAX_AGE:   String(30 * D),     // 30 days
    }),
    // ── Front-office — shift-length session (8 h) ──
    app('rooms-front-office', 'apps/front-office', 3002, 'https://fo.therooms.in', {
      NEXTAUTH_COOKIE_NAME:       'therooms.fo.session',
      NEXTAUTH_SESSION_MAX_AGE:   String(8 * H),      // 8 h
    }),
    // ── Admin — working-day session (12 h) ──
    app('rooms-admin', 'apps/admin', 3003, 'https://admin.therooms.in', {
      NEXTAUTH_COOKIE_NAME:       'therooms.admin.session',
      NEXTAUTH_SESSION_MAX_AGE:   String(12 * H),     // 12 h
    }),
    // ── Super-admin — shortest session (8 h) for privileged access ──
    app('rooms-super-admin', 'apps/super-admin', 3004, 'https://superadmin.therooms.in', {
      NEXTAUTH_COOKIE_NAME:       'therooms.superadmin.session',
      NEXTAUTH_SESSION_MAX_AGE:   String(8 * H),      // 8 h
    }),
  ],
};
