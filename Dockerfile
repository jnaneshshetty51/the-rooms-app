# ─── Dockerfile: The Rooms — Monorepo Production Build ────────────────────────
# Multi-stage: deps → builder → runner
# Build each portal app separately for isolation

FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace manifests for turbo cache optimization
COPY package.json package-lock.json .npmrc ./
COPY turbo.json ./
COPY apps/ apps/
COPY packages/ packages/

# Install ALL dependencies (turbo will cache per-app)
RUN npm ci --workspace-concurrency=0

# ── Build stage (runs all apps) ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy npm cache from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/package.json ./
COPY --from=deps /app/turbo.json ./

# Build each portal app
# Web (public website)
RUN npm run build --workspace=@the-rooms/web

# Guest portal
RUN npm run build --workspace=@the-rooms/guest-portal

# Front office
RUN npm run build --workspace=@the-rooms/front-office

# Admin
RUN npm run build --workspace=@the-rooms/admin

# Super admin
RUN npm run build --workspace=@the-rooms/super-admin

# ── Production runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/guest-portal/.next ./apps/guest-portal/.next
COPY --from=builder /app/apps/guest-portal/public ./apps/guest-portal/public
COPY --from=builder /app/apps/front-office/.next ./apps/front-office/.next
COPY --from=builder /app/apps/front-office/public ./apps/front-office/public
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/super-admin/.next ./apps/super-admin/.next
COPY --from=builder /app/apps/super-admin/public ./apps/super-admin/public

# Copy node_modules needed at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/guest-portal/node_modules ./apps/guest-portal/node_modules
COPY --from=builder /app/apps/front-office/node_modules ./apps/front-office/node_modules
COPY --from=builder /app/apps/admin/node_modules ./apps/admin/node_modules
COPY --from=builder /app/apps/super-admin/node_modules ./apps/super-admin/node_modules

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Each portal runs on its own port
EXPOSE 3000 3001 3002 3003 3004

CMD ["node", "apps/web/server.js"]