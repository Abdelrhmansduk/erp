# Dockerfile for Enterprise ERP Platform - Khalid Al-Sulaim Group
# Multi-stage Build: 1. Build Frontend React Assets, 2. Production Nginx Container

# Stage 1: Build Environment
FROM node:20-alpine AS build

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build Vite Production Bundle
RUN npm run build

# Stage 2: Production Web Server
FROM nginx:alpine AS production

# Copy custom Nginx configuration
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
