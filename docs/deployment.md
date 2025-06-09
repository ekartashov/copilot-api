# Deployment Guide

This document provides comprehensive deployment guides for the Copilot API proxy across different environments and platforms.

## Overview

The Copilot API proxy supports multiple deployment methods:
- **npx** - Direct execution without installation
- **Docker** - Containerized deployment
- **Podman** - Container deployment without Docker daemon
- **From Source** - Local development and custom builds
- **Production** - Systemd, PM2, and orchestration platforms

## Quick Deployment Options

### Using npx (Recommended for Testing)

The fastest way to get started:

```bash
# Start immediately with default settings
npx copilot-api@latest start

# Custom port and verbose logging
npx copilot-api@latest start --port 8080 --verbose

# Business account with rate limiting
npx copilot-api@latest start --business --rate-limit 30

# Generate token only
npx copilot-api@latest auth
```

**Pros:**
- No installation required
- Always uses latest version
- Perfect for testing and development

**Cons:**
- Downloads package each time
- Not suitable for production
- Requires internet access for initial download

## Docker Deployment

### Basic Docker Setup

**Build the image:**
```bash
git clone https://github.com/ericc-ch/copilot-api.git
cd copilot-api
docker build -t copilot-api .
```

**Run without pre-generated token:**
```bash
docker run --init -it -p 4141:4141 copilot-api
```

**Run with pre-generated token:**
```bash
docker run --init -it \
  -e GH_TOKEN="your_token_here" \
  -p 4141:4141 \
  copilot-api
```

### Docker with Token Generation

Generate a token in a temporary container:

```bash
docker run -it --rm copilot-api sh -c '
    bun run dist/main.js auth && \
    echo "GitHub Token: $(cat /root/.local/share/copilot-api/github_token)"'
```

Then use the token in your main container:
```bash
docker run --init -d \
  --name copilot-api \
  -e GH_TOKEN="generated_token_here" \
  -p 4141:4141 \
  --restart unless-stopped \
  copilot-api
```

### Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  copilot-api:
    build: .
    container_name: copilot-api
    ports:
      - "4141:4141"
    environment:
      - GH_TOKEN=${GH_TOKEN}
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4141/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - copilot-api
    restart: unless-stopped
```

**Environment file (.env):**
```bash
GH_TOKEN=ghp_your_token_here
```

**Run with Docker Compose:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f copilot-api

# Stop services
docker-compose down
```

### Multi-stage Docker Build

The project includes optimized Dockerfiles:

**Production (Dockerfile):**
```dockerfile
FROM oven/bun:1.1.38-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production

# Build application
FROM base AS build
COPY package.json bun.lock bunfig.toml tsconfig.json tsup.config.ts ./
COPY src ./src
RUN bun install --frozen-lockfile
RUN bun run build

# Production image
FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 4141
CMD ["bun", "run", "dist/main.js", "start"]
```

**Development (Dockerfile.dev):**
```dockerfile
FROM oven/bun:1.1.38-alpine

WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install

COPY . .

EXPOSE 4141
CMD ["bun", "run", "dev"]
```

**NPX optimized (Dockerfile.npx):**
```dockerfile
FROM node:18-alpine
RUN npm install -g copilot-api@latest
EXPOSE 4141
CMD ["copilot-api", "start"]
```

## Podman Deployment

Podman provides Docker-compatible container deployment without a daemon:

### Basic Podman Usage

```bash
# Build image
podman build -t copilot-api .

# Run container
podman run --init -it -p 4141:4141 copilot-api

# Run with token
podman run --init -it \
  -e GH_TOKEN="your_token_here" \
  -p 4141:4141 \
  copilot-api

# Run detached
podman run --init -d \
  --name copilot-api \
  -e GH_TOKEN="your_token_here" \
  -p 4141:4141 \
  --restart unless-stopped \
  copilot-api
```

### Podman Compose

**podman-compose.yml:**
```yaml
version: '3.8'

services:
  copilot-api:
    build: .
    ports:
      - "4141:4141"
    environment:
      GH_TOKEN: ${GH_TOKEN}
    restart: unless-stopped
```

```bash
# Install podman-compose
pip install podman-compose

# Run with podman-compose
podman-compose up -d
```

### Podman Systemd Integration

Generate systemd service files:

```bash
# Create user service
podman generate systemd --new --name copilot-api \
  --files --restart-policy=always

# Enable user service
systemctl --user enable container-copilot-api.service
systemctl --user start container-copilot-api.service
```

## Source Deployment

### Prerequisites

- **Bun >= 1.2.x** (recommended) or Node.js >= 18
- **Git** for cloning repository
- **Build tools** (make, gcc, python) for native dependencies

### Development Setup

```bash
# Clone repository
git clone https://github.com/ericc-ch/copilot-api.git
cd copilot-api

# Install dependencies
bun install

# Development mode (auto-reload)
bun run dev

# Production build and run
bun run build
bun run start
```

### Node.js Alternative

If Bun is not available:

```bash
# Install with npm
npm install

# Build project
npm run build

# Start server
npm start
```

### Custom Build Configuration

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false,
  external: ['bun:test'],
  noExternal: ['consola', 'citty', 'hono'],
})
```

## Production Deployment

### Systemd Service (Linux)

**Create service file** `/etc/systemd/system/copilot-api.service`:

```ini
[Unit]
Description=Copilot API Proxy
Documentation=https://github.com/ericc-ch/copilot-api
After=network.target

[Service]
Type=simple
User=copilot-api
Group=copilot-api
WorkingDirectory=/opt/copilot-api
ExecStart=/usr/local/bin/bun run dist/main.js start --port 4141
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=GH_TOKEN=your_token_here
StandardOutput=journal
StandardError=journal
SyslogIdentifier=copilot-api

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/copilot-api
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

**Setup and start:**
```bash
# Create user
sudo useradd -r -s /bin/false copilot-api

# Install application
sudo mkdir -p /opt/copilot-api
sudo cp -r . /opt/copilot-api/
sudo chown -R copilot-api:copilot-api /opt/copilot-api

# Install and start service
sudo systemctl daemon-reload
sudo systemctl enable copilot-api
sudo systemctl start copilot-api

# Check status
sudo systemctl status copilot-api
sudo journalctl -u copilot-api -f
```

### PM2 Process Manager

**Install PM2:**
```bash
npm install -g pm2
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'copilot-api',
    script: 'bun',
    args: 'run dist/main.js start --port 4141',
    cwd: '/opt/copilot-api',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      GH_TOKEN: 'your_token_here'
    },
    log_file: '/var/log/copilot-api/combined.log',
    out_file: '/var/log/copilot-api/out.log',
    error_file: '/var/log/copilot-api/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

**PM2 Commands:**
```bash
# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs copilot-api
pm2 monit

# Restart
pm2 restart copilot-api

# Stop
pm2 stop copilot-api

# Auto-start on boot
pm2 startup
pm2 save
```

## Kubernetes Deployment

### Basic Kubernetes Manifests

**Namespace:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: copilot-api
```

**Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: copilot-api-secret
  namespace: copilot-api
type: Opaque
stringData:
  github-token: ghp_your_token_here
```

**ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: copilot-api-config
  namespace: copilot-api
data:
  NODE_ENV: "production"
  PORT: "4141"
```

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: copilot-api
  namespace: copilot-api
  labels:
    app: copilot-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: copilot-api
  template:
    metadata:
      labels:
        app: copilot-api
    spec:
      containers:
      - name: copilot-api
        image: copilot-api:latest
        ports:
        - containerPort: 4141
          name: http
        env:
        - name: GH_TOKEN
          valueFrom:
            secretKeyRef:
              name: copilot-api-secret
              key: github-token
        envFrom:
        - configMapRef:
            name: copilot-api-config
        livenessProbe:
          httpGet:
            path: /
            port: 4141
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: 4141
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "500m"
```

**Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: copilot-api-service
  namespace: copilot-api
spec:
  selector:
    app: copilot-api
  ports:
  - name: http
    port: 80
    targetPort: 4141
  type: ClusterIP
```

**Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: copilot-api-ingress
  namespace: copilot-api
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: copilot-api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: copilot-api-service
            port:
              number: 80
```

**Deploy to Kubernetes:**
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n copilot-api
kubectl logs -f deployment/copilot-api -n copilot-api

# Port forward for testing
kubectl port-forward service/copilot-api-service 4141:80 -n copilot-api
```

## Reverse Proxy Configuration

### Nginx

**nginx.conf:**
```nginx
upstream copilot-api {
    server localhost:4141;
    keepalive 32;
}

server {
    listen 80;
    server_name copilot-api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name copilot-api.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://copilot-api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### Traefik

**docker-compose.yml with Traefik:**
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/traefik.yml:ro
    
  copilot-api:
    build: .
    environment:
      - GH_TOKEN=${GH_TOKEN}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.copilot-api.rule=Host(`copilot-api.example.com`)"
      - "traefik.http.routers.copilot-api.tls=true"
      - "traefik.http.services.copilot-api.loadbalancer.server.port=4141"
```

## Health Checks and Monitoring

### Health Check Endpoint

The proxy provides a health check at `/`:

```bash
curl http://localhost:4141/
# Response: "Server running"
```

### Monitoring Scripts

**health-check.sh:**
```bash
#!/bin/bash
ENDPOINT="http://localhost:4141"
TIMEOUT=10

if curl -f -s --max-time $TIMEOUT "$ENDPOINT" > /dev/null; then
    echo "$(date): Copilot API is healthy"
    exit 0
else
    echo "$(date): Copilot API health check failed"
    exit 1
fi
```

**Systemd health monitoring:**
```ini
[Unit]
Description=Copilot API Health Check
After=copilot-api.service

[Service]
Type=oneshot
ExecStart=/opt/copilot-api/health-check.sh
StandardOutput=journal

[Install]
WantedBy=multi-user.target
```

### Log Monitoring

**Centralized logging with rsyslog:**
```bash
# /etc/rsyslog.d/copilot-api.conf
if $programname == 'copilot-api' then /var/log/copilot-api.log
& stop
```

## Security Considerations

### Network Security

1. **Firewall rules** - Only allow necessary ports
2. **TLS termination** - Use HTTPS in production
3. **Rate limiting** - Implement at proxy level
4. **IP restrictions** - Limit access to known clients

### Container Security

```dockerfile
# Security-hardened Dockerfile
FROM oven/bun:1.1.38-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S copilot-api -u 1001

# Copy application
COPY --from=build --chown=copilot-api:nodejs /app/dist ./dist
COPY --from=deps --chown=copilot-api:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER copilot-api

EXPOSE 4141
CMD ["bun", "run", "dist/main.js", "start"]
```

### File Permissions

```bash
# Secure token storage
chmod 600 ~/.local/share/copilot-api/github_token
chown copilot-api:copilot-api ~/.local/share/copilot-api/github_token
```

## Troubleshooting Deployment

### Common Issues

#### 1. Port Binding Issues
```bash
# Check port usage
netstat -tulpn | grep 4141
lsof -i :4141

# Use different port
copilot-api start --port 8080
```

#### 2. Container Permission Issues
```bash
# Fix file permissions in container
docker exec -it copilot-api chmod 600 /root/.local/share/copilot-api/github_token
```

#### 3. Network Connectivity
```bash
# Test from container
docker exec -it copilot-api curl https://api.github.com/user

# Check DNS resolution
docker exec -it copilot-api nslookup api.github.com
```

### Debugging Commands

```bash
# Check container logs
docker logs copilot-api -f

# Execute commands in container
docker exec -it copilot-api /bin/sh

# Test API endpoints
curl -v http://localhost:4141/models

# Check systemd service
systemctl status copilot-api
journalctl -u copilot-api -f
```

---

**Next Steps:**
- Review [architecture documentation](architecture.md) for system design details
- Check [testing guide](testing.md) for deployment validation
- See [contributing documentation](contributing.md) for development workflow