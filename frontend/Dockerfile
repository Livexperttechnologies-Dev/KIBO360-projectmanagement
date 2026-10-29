# ==============================================================================
# KIBO360 Project Hub — Frontend Production Dockerfile
# Livexpert Technologies Pvt. Ltd.
# ==============================================================================

# Stage 1: Build the Vite Single-Page Application
FROM node:20-alpine AS builder

WORKDIR /app

# API base URL baked into the bundle. Keep the default (/api/v1) when this
# container proxies /api/ to the backend via API_UPSTREAM; otherwise pass the
# backend's public URL, e.g. https://api.example.com/api/v1
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src ./src/
COPY public ./public/

RUN npm run build

# Stage 2: Serve with lightweight Nginx Alpine
FROM nginx:1.27-alpine AS runner

# Replace the default site with the SPA config
RUN rm -rf /etc/nginx/conf.d/* && mkdir -p /etc/nginx/kibo360 && touch /etc/nginx/kibo360/api-proxy.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Generates the optional /api/ proxy from API_UPSTREAM at container start.
# sed guards against CRLF line endings from a Windows checkout.
COPY nginx/40-api-proxy.sh /docker-entrypoint.d/40-api-proxy.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-api-proxy.sh && chmod +x /docker-entrypoint.d/40-api-proxy.sh

# Copy compiled static assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
