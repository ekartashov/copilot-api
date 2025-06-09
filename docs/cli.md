# CLI Usage Guide

This document covers all command-line interface (CLI) options and usage patterns for the Copilot API proxy.

## Overview

The Copilot API provides a CLI built with [citty](https://github.com/unjs/citty) that offers two main commands:
- `start` - Start the proxy server
- `auth` - Run GitHub authentication flow

## Installation Methods

### Global Installation
```bash
# Install globally
npm install -g copilot-api

# Use directly
copilot-api start
```

### Using npx (Recommended)
```bash
# No installation required
npx copilot-api@latest start

# Specific version
npx copilot-api@0.3.0 start
```

### From Source
```bash
git clone https://github.com/ericc-ch/copilot-api.git
cd copilot-api
bun install

# Development mode
bun run dev

# Production mode
bun run start
```

## Commands

### `start` - Start the Server

Starts the proxy server with optional configuration.

#### Basic Usage
```bash
copilot-api start
# Server starts at http://localhost:4141
```

#### CLI Options

| Flag | Alias | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--port` | `-p` | string | `"4141"` | Port to listen on |
| `--verbose` | `-v` | boolean | `false` | Enable verbose logging |
| `--business` | | boolean | `false` | Use business plan GitHub account |
| `--manual` | | boolean | `false` | Enable manual request approval |
| `--rate-limit` | `-r` | string | | Rate limit in seconds between requests |
| `--wait` | `-w` | boolean | `false` | Wait instead of error when rate limit is hit |
| `--github-token` | `-g` | string | | Provide GitHub token directly |

#### Examples

**Basic server start:**
```bash
copilot-api start
```

**Custom port with verbose logging:**
```bash
copilot-api start --port 8080 --verbose
```

**Business account configuration:**
```bash
copilot-api start --business
```

**Rate limiting with 30-second intervals:**
```bash
copilot-api start --rate-limit 30
```

**Rate limiting with wait mode (blocks instead of erroring):**
```bash
copilot-api start --rate-limit 30 --wait
```

**Manual approval mode (prompts for each request):**
```bash
copilot-api start --manual
```

**Using pre-generated GitHub token:**
```bash
copilot-api start --github-token ghp_YOUR_TOKEN_HERE
```

**Combined options:**
```bash
copilot-api start \
  --port 8080 \
  --verbose \
  --business \
  --rate-limit 30 \
  --wait
```

### `auth` - GitHub Authentication

Runs the GitHub OAuth device flow to generate and store an authentication token.

#### Basic Usage
```bash
copilot-api auth
```

#### CLI Options

| Flag | Alias | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--verbose` | `-v` | boolean | `false` | Enable verbose logging |

#### Examples

**Basic authentication:**
```bash
copilot-api auth
```

**Authentication with verbose output:**
```bash
copilot-api auth --verbose
```

#### Authentication Flow

1. **Device Code Generation**: The CLI requests a device code from GitHub
2. **User Prompt**: You'll see a message like:
   ```
   Please enter the code "ABCD-EFGH" in https://github.com/login/device
   ```
3. **Browser Authorization**: Open the URL and enter the provided code
4. **Token Storage**: Upon approval, the token is saved to `~/.local/share/copilot-api/github_token`
5. **Completion**: The CLI confirms successful authentication

## Environment Variables

The CLI respects several environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GH_TOKEN` | Pre-generated GitHub token | None |
| `NODE_ENV` | Environment mode | `development` |

### Using Environment Variables

```bash
# With pre-generated token
GH_TOKEN=ghp_YOUR_TOKEN copilot-api start

# Production mode
NODE_ENV=production copilot-api start
```

## Configuration Examples

### Development Setup
```bash
# Start with verbose logging and manual approval
copilot-api start --verbose --manual
```

### Production Setup
```bash
# Business account with rate limiting
NODE_ENV=production copilot-api start \
  --business \
  --rate-limit 60 \
  --wait \
  --port 4141
```

### Testing Setup
```bash
# Custom port for testing
copilot-api start --port 8888 --verbose
```

## Server Lifecycle

### Startup Process

When running `copilot-api start`, the following happens:

1. **Path Setup**: Creates `~/.local/share/copilot-api/` directory
2. **VS Code Version**: Caches VS Code version for API headers
3. **GitHub Authentication**: 
   - Uses provided token (`--github-token` or `GH_TOKEN`)
   - Or loads existing token from storage
   - Or prompts for new authentication
4. **Copilot Token**: Exchanges GitHub token for Copilot API token
5. **Model Caching**: Fetches and caches available models
6. **Server Start**: Starts HTTP server on specified port

### Token Refresh

The server automatically refreshes Copilot tokens:
- **Refresh Interval**: `(refresh_in - 60) * 1000` milliseconds
- **Auto-Retry**: Continues attempting refresh on failures
- **Logging**: Verbose mode shows refresh attempts

### Graceful Shutdown

The server handles termination signals gracefully:
- Stops accepting new requests
- Completes in-flight requests
- Cleans up resources

## Output and Logging

### Standard Output

**Normal mode:**
```
✔ Server started at http://localhost:4141
```

**Verbose mode (`--verbose`):**
```
ℹ Verbose logging enabled
ℹ Using business plan GitHub account
ℹ Logged in as username
✔ Server started at http://localhost:4141
```

### Request Logging

With verbose mode enabled, you'll see:
```
→ POST /chat/completions
ℹ Current token count: 42
✔ 200 Response sent
```

### Error Handling

The CLI provides clear error messages:

**Authentication errors:**
```
✖ Failed to get GitHub token: {"error":"access_denied"}
```

**Network errors:**
```
✖ Failed to create chat completions: Network request failed
```

**Configuration errors:**
```
✖ Invalid port number: must be between 1 and 65535
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Error: EADDRINUSE
copilot-api start --port 8080
```

#### Authentication Failed
```bash
# Re-run auth flow
copilot-api auth
```

#### Token Expired
```bash
# Force new authentication
rm ~/.local/share/copilot-api/github_token
copilot-api start
```

#### Permission Denied
```bash
# Check file permissions
ls -la ~/.local/share/copilot-api/
chmod 600 ~/.local/share/copilot-api/github_token
```

### Debug Mode

Enable maximum verbosity:
```bash
copilot-api start --verbose
```

Check server status:
```bash
curl http://localhost:4141/
# Should return: "Server running"
```

Test API endpoints:
```bash
curl http://localhost:4141/models
```

### File Locations

**Token storage:**
- Linux/macOS: `~/.local/share/copilot-api/github_token`
- Windows: `%APPDATA%\copilot-api\github_token`

**Log files:**
- Logs are written to stdout/stderr
- Use shell redirection for file logging:
  ```bash
  copilot-api start --verbose > server.log 2>&1
  ```

## Integration Examples

### Systemd Service (Linux)

Create `/etc/systemd/system/copilot-api.service`:
```ini
[Unit]
Description=Copilot API Proxy
After=network.target

[Service]
Type=simple
User=copilot-api
WorkingDirectory=/opt/copilot-api
ExecStart=/usr/local/bin/copilot-api start --port 4141
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Docker Compose

```yaml
version: '3.8'
services:
  copilot-api:
    build: .
    ports:
      - "4141:4141"
    environment:
      - GH_TOKEN=${GH_TOKEN}
    restart: unless-stopped
```

### Process Manager (PM2)

```json
{
  "apps": [{
    "name": "copilot-api",
    "script": "npx",
    "args": ["copilot-api@latest", "start", "--port", "4141"],
    "env": {
      "NODE_ENV": "production"
    }
  }]
}
```

---

**Next Steps:**
- Review the [API documentation](api.md) for endpoint usage
- Check [authentication details](auth.md) for OAuth flow specifics
- See [deployment guide](deployment.md) for container and production setups