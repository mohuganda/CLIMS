# syntax=docker/dockerfile:1

# Builds the CLIMS web app and serves it with nginx.
#
# Build from the repository root, which is where both the app and this
# directory's nginx config can be seen:
#
#   docker build -f infra/docker/frontend/Dockerfile -t clims-frontend .
#
# VITE_* values are compiled into the public JavaScript bundle. They configure
# the app; they are not secrets and must never be given one.

FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so this layer is reused until the lockfile changes.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

RUN npm run build

# The unprivileged image runs as a non-root user and cannot bind ports below
# 1024, which is all a static file server needs.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY infra/docker/frontend/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY infra/docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/healthz || exit 1
