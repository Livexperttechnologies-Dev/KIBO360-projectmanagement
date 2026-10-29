# ==============================================================================
# KIBO360 Project Hub — Backend Production Dockerfile
# Livexpert Technologies Pvt. Ltd.
# ==============================================================================

# Stage 1: Build & compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma's query engine needs OpenSSL, which node:alpine does not ship
RUN apk add --no-cache openssl

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY tsconfig.server.json ./
COPY src ./src/

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# curl for the healthcheck, OpenSSL for Prisma's query engine
RUN apk add --no-cache curl openssl

# Copy package manifests and install production-only dependencies
# (includes the Prisma CLI so the entrypoint can run migrations)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy Prisma schema and generated engines from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Entrypoint applies migrations and bootstraps the admin, then starts the API.
# sed guards against CRLF line endings from a Windows checkout.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# Create logs directory and assign permissions to node user
RUN mkdir -p /app/logs /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health/liveness || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
