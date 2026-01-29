# ============================================
# Postman Documentation Generator - Client
# Next.js 16 Frontend Application
# ============================================

# Stage 1: Builder
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm ci for reproducible builds
RUN npm ci

# Copy source code
COPY . .

# Disable Next.js telemetry
RUN echo "NEXT_TELEMETRY_DISABLED=1" >> .env.local

# Build the application
RUN npm run build

# ============================================
# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Copy built assets from builder stage
COPY --from=builder /app/public ./public

# Copy standalone Next.js output
COPY --from=builder /app/.next/standalone ./

# Copy static files
COPY --from=builder /app/.next/static ./.next/static

# Copy environment file
COPY --from=builder /app/.env.local ./.env.local

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

# ============================================
# Alternative: Development Dockerfile
# Uncomment below for development with hot reload
# ============================================

# FROM node:20-alpine AS development

# WORKDIR /app

# ENV NODE_ENV=development
# ENV NEXT_TELEMETRY_DISABLED=1

# COPY package*.json ./
# RUN npm ci

# COPY . .

# EXPOSE 3000

# CMD ["npm", "run", "dev"]
