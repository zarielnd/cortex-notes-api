# syntax=docker/dockerfile:1.7

############################
# 1️. Dependencies stage
############################
FROM node:20-alpine AS deps

# Create app directory
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy only package manifests first (better caching)
COPY package.json package-lock.json ./

# Install production + build dependencies cleanly
RUN npm ci


############################
# 2️. Build stage
############################
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build NestJS app
RUN npm run build


############################
# 3️. Production runtime
############################
FROM node:20-alpine AS runner

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy only production artifacts
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json ./

# Switch to non-root user
USER app

# Expose Nest default port
EXPOSE 3000

# Healthcheck (optional if you have /health endpoint)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode===200?0:1)})"

# Start application
CMD ["node", "dist/main.js"]