# Configuration Guide

This document covers all configuration options, environment variables, and runtime settings for the Copilot API proxy.

## Overview

The Copilot API proxy can be configured through:
- **Environment variables** - For deployment and automation
- **CLI flags** - For runtime behavior
- **Configuration files** - For development settings

## Environment Variables

### Authentication

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GH_TOKEN` | Primary GitHub personal access token | None | `ghp_xxxxxxxxxxxx` |
| `GH_TOKEN_1` | First account token (for multi-account) | None | `ghp_account1_token` |
| `GH_TOKEN_2` | Second account token (for multi-account) | None | `ghp_account2_token` |
| `GH_TOKEN_N` | Additional account tokens (N=3,4,5...) | None | `ghp_accountN_token` |
| `NODE_ENV` | Runtime environment mode | `development` | `production` |

**Usage Examples:**
```bash
# Single account (traditional)
GH_TOKEN=ghp_your_token copilot-api start

# Multiple accounts for rotation
GH_TOKEN_1=ghp_account1_token \
GH_TOKEN_2=ghp_account2_token \
GH_TOKEN_3=ghp_account3_token \
copilot-api start --accounts 3

# Production environment with multiple accounts
NODE_ENV=production \
GH_TOKEN_1=ghp_prod_account1 \
GH_TOKEN_2=ghp_prod_account2 \
copilot-api start --accounts 2
```

### Server Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port (if not using CLI flag) | `4141` | `8080` |
| `HOST` | Server host binding | `localhost` | `0.0.0.0` |

**Docker Environment:**
```bash
docker run -e GH_TOKEN="$TOKEN" -e PORT=8080 -p 8080:8080 copilot-api
```

### Development Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VERBOSE_TESTS` | Enable verbose test output | `false` | `true` |
| `DEBUG` | Enable debug logging | `false` | `true` |

## CLI Configuration

### Start Command Options

Complete CLI flag reference for the `start` command:

```bash
copilot-api start [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port`, `-p` | string | `"4141"` | Port to listen on |
| `--verbose`, `-v` | boolean | `false` | Enable verbose logging |
| `--business` | boolean | `false` | Use business plan GitHub account |
| `--manual` | boolean | `false` | Enable manual request approval |
| `--rate-limit`, `-r` | string | None | Rate limit in seconds between requests |
| `--wait`, `-w` | boolean | `false` | Wait instead of error when rate limit is hit |
| `--github-token`, `-g` | string | None | Provide GitHub token directly |
| `--accounts`, `-a` | number | `1` | Number of GitHub accounts to use for rotation |
| `--rotation-strategy` | string | `"round_robin"` | Account rotation strategy (round_robin, failover) |
| `--health-check-interval` | number | `300` | Account health check interval in seconds |

### Auth Command Options

```bash
copilot-api auth [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--verbose`, `-v` | boolean | `false` | Enable verbose logging |

## Configuration Files

### Package.json Scripts

Development and build scripts configuration:

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "bun run --watch ./src/main.ts",
    "start": "NODE_ENV=production bun run ./src/main.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

### Bun Configuration (bunfig.toml)

Test and build configuration:

```toml
[test]
coverage = true
timeout = 30000
bail = false
preload = ["./test/setup.ts"]
coverage-dir = "./coverage"
coverage-reporter = ["text", "lcov", "html"]
coverage-threshold = 80
```

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}
```

## Runtime Configuration

### Application State

The proxy maintains runtime state in [`src/lib/state.ts`](../src/lib/state.ts):

```typescript
interface State {
  githubToken?: string        // GitHub personal access token
  copilotToken?: string      // Copilot API token (auto-generated)
  accountManager?: AccountManager // Multi-account rotation system
  currentAccountId?: string   // Active account identifier
  accountType: string        // "individual" or "business"
  models?: ModelsResponse    // Cached available models
  vsCodeVersion?: string     // VS Code version for API headers
  manualApprove: boolean     // Manual request approval flag
  rateLimitWait: boolean     // Wait on rate limit vs error
  rateLimitSeconds?: number  // Rate limit interval
  lastRequestTimestamp?: number // Last request time
}
```

### Default Values

```typescript
export const state: State = {
  accountType: "individual",
  manualApprove: false,
  rateLimitWait: false,
}
```

### File System Paths

Token and data storage locations:

```typescript
// From src/lib/paths.ts
const APP_DIR = path.join(os.homedir(), ".local", "share", "copilot-api")
const GITHUB_TOKEN_PATH = path.join(APP_DIR, "github_token")

export const PATHS = {
  APP_DIR,                    // ~/.local/share/copilot-api/
  GITHUB_TOKEN_PATH,         // ~/.local/share/copilot-api/github_token
}
```

**Platform-specific paths:**
- **Linux/macOS**: `~/.local/share/copilot-api/`
- **Windows**: `%APPDATA%\copilot-api\`

**Account Management Paths:**
```typescript
// Multi-account token storage
const ACCOUNT_TOKENS_DIR = path.join(APP_DIR, "accounts")
const ROTATION_LOG_PATH = path.join(APP_DIR, "rotation.log")

export const ACCOUNT_PATHS = {
  TOKENS_DIR: ACCOUNT_TOKENS_DIR,        // ~/.local/share/copilot-api/accounts/
  ROTATION_LOG: ROTATION_LOG_PATH,       // ~/.local/share/copilot-api/rotation.log
  TOKEN_FILE: (id: string) => path.join(ACCOUNT_TOKENS_DIR, `github_token_${id}`)
}
```

## API Configuration

### GitHub API Settings

```typescript
// From src/lib/api-config.ts
export const GITHUB_BASE_URL = "https://github.com"
export const GITHUB_API_BASE_URL = "https://api.github.com"
export const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98"
export const GITHUB_APP_SCOPES = ["read:user"].join(" ")
```

### Copilot API Settings

```typescript
const COPILOT_VERSION = "0.26.7"
const EDITOR_PLUGIN_VERSION = `copilot-chat/${COPILOT_VERSION}`
const USER_AGENT = `GitHubCopilotChat/${COPILOT_VERSION}`
const API_VERSION = "2025-04-01"

export const copilotBaseUrl = (state: State) =>
  `https://api.${state.accountType}.githubcopilot.com`
```

### HTTP Headers Configuration

**Standard Headers:**
```typescript
export const standardHeaders = () => ({
  "content-type": "application/json",
  "accept": "application/json",
})
```

**Copilot Headers:**
```typescript
export const copilotHeaders = (state: State, vision: boolean = false) => {
  const headers = {
    "Authorization": `Bearer ${state.copilotToken}`,
    "copilot-integration-id": "vscode-chat",
    "editor-version": `vscode/${state.vsCodeVersion}`,
    "editor-plugin-version": EDITOR_PLUGIN_VERSION,
    "user-agent": USER_AGENT,
    "openai-intent": "conversation-panel",
    "x-github-api-version": API_VERSION,
    "x-request-id": randomUUID(),
  }

  if (vision) headers["copilot-vision-request"] = "true"
  return headers
}
```

## Configuration Examples

### Development Setup

```bash
# Local development with verbose logging
NODE_ENV=development copilot-api start --verbose --port 3000

# Development with manual approval
copilot-api start --verbose --manual
```

### Production Setup

```bash
# Production with business account
NODE_ENV=production copilot-api start \
  --business \
  --rate-limit 60 \
  --wait \
  --port 4141
```

### Multi-Account Setup

```bash
# Basic multi-account rotation
GH_TOKEN_1=ghp_account1_token \
GH_TOKEN_2=ghp_account2_token \
GH_TOKEN_3=ghp_account3_token \
copilot-api start --accounts 3

# Production multi-account with custom rotation strategy
NODE_ENV=production \
GH_TOKEN_1=ghp_prod_account1 \
GH_TOKEN_2=ghp_prod_account2 \
GH_TOKEN_3=ghp_prod_account3 \
copilot-api start \
  --accounts 3 \
  --rotation-strategy failover \
  --health-check-interval 600 \
  --business \
  --rate-limit 30 \
  --wait
```

### Docker Configuration

**Environment file (`.env`):**
```bash
# Single account
GH_TOKEN=ghp_your_token_here
NODE_ENV=production
PORT=4141

# Multi-account configuration
GH_TOKEN_1=ghp_account1_token
GH_TOKEN_2=ghp_account2_token
GH_TOKEN_3=ghp_account3_token
NODE_ENV=production
PORT=4141
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  copilot-api:
    build: .
    ports:
      - "${PORT:-4141}:${PORT:-4141}"
    environment:
      - GH_TOKEN=${GH_TOKEN:-}
      - GH_TOKEN_1=${GH_TOKEN_1:-}
      - GH_TOKEN_2=${GH_TOKEN_2:-}
      - GH_TOKEN_3=${GH_TOKEN_3:-}
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-4141}
    command: ["start", "--accounts", "3", "--rotation-strategy", "round_robin"]
    restart: unless-stopped
```

### Kubernetes Configuration

**ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: copilot-api-config
data:
  NODE_ENV: "production"
  PORT: "4141"
```

**Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: copilot-api-secret
type: Opaque
stringData:
  github-token: ghp_your_token_here
```

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: copilot-api
spec:
  template:
    spec:
      containers:
      - name: copilot-api
        image: copilot-api:latest
        ports:
        - containerPort: 4141
        env:
        - name: GH_TOKEN
          valueFrom:
            secretKeyRef:
              name: copilot-api-secret
              key: github-token
        envFrom:
        - configMapRef:
            name: copilot-api-config
```

## Rate Limiting Configuration

### Basic Rate Limiting

```bash
# 30-second intervals between requests
copilot-api start --rate-limit 30
```

### Rate Limiting with Wait

```bash
# Wait instead of erroring when rate limited
copilot-api start --rate-limit 30 --wait
```

### Rate Limiting Logic

From [`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts):

```typescript
export async function checkRateLimit(state: State): Promise<void> {
  if (!state.rateLimitSeconds) return

  const now = Date.now()
  const timeSinceLastRequest = state.lastRequestTimestamp 
    ? now - state.lastRequestTimestamp 
    : state.rateLimitSeconds * 1000

  if (timeSinceLastRequest < state.rateLimitSeconds * 1000) {
    const waitTime = state.rateLimitSeconds * 1000 - timeSinceLastRequest

    if (state.rateLimitWait) {
      await sleep(waitTime)
    } else {
      throw new HTTPError(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`, 
        createMockResponse({}, 429))
    }
  }

  state.lastRequestTimestamp = now
}
```

## Logging Configuration

### Log Levels

```typescript
// From src/main.ts
if (options.verbose) {
  consola.level = 5  // Maximum verbosity
  consola.info("Verbose logging enabled")
}
```

### Log Output Examples

**Normal Mode:**
```
✔ Server started at http://localhost:4141
```

**Verbose Mode:**
```
ℹ Verbose logging enabled
ℹ Using business plan GitHub account
ℹ Logged in as username
ℹ Current token count: 42
✔ Server started at http://localhost:4141
```

## Security Configuration

### File Permissions

```typescript
// From src/lib/paths.ts
async function ensureFile(filePath: string): Promise<void> {
  try {
    await fs.access(filePath, fs.constants.W_OK)
  } catch {
    await fs.writeFile(filePath, "")
    await fs.chmod(filePath, 0o600)  // Owner read/write only
  }
}
```

### Token Security

- **GitHub tokens** stored with `600` permissions (owner only)
- **Copilot tokens** kept in memory only
- **No sensitive data** in logs (unless verbose mode)

## Performance Configuration

### VS Code Version Caching

```typescript
// From src/lib/vscode-version.ts
export async function cacheVSCodeVersion(): Promise<void> {
  try {
    const version = await getVSCodeVersion()
    state.vsCodeVersion = version
  } catch (error) {
    state.vsCodeVersion = "1.95.0"  // Fallback version
  }
}
```

### Model Caching

```typescript
// From src/lib/models.ts
export async function cacheModels(): Promise<void> {
  const models = await getModels()
  state.models = models
}
```

## Troubleshooting Configuration

### Common Configuration Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :4141

# Use different port
copilot-api start --port 8080
```

#### 2. Permission Denied
```bash
# Fix token file permissions
chmod 600 ~/.local/share/copilot-api/github_token

# Check directory permissions
ls -la ~/.local/share/copilot-api/
```

#### 3. Environment Variables Not Loading
```bash
# Check environment
env | grep GH_TOKEN

# Verify in Docker
docker exec container-name env | grep GH_TOKEN
```

#### 4. Account Management Issues
```bash
# Check account configuration
env | grep GH_TOKEN_

# Verify account manager initialization
copilot-api start --verbose --accounts 3

# Check rotation logs
tail -f ~/.local/share/copilot-api/rotation.log
```

#### 5. Token File Structure Issues
```bash
# Check account token files
ls -la ~/.local/share/copilot-api/accounts/

# Fix permissions for all account tokens
chmod 600 ~/.local/share/copilot-api/accounts/github_token_*

# Verify token format
copilot-api accounts validate
```

### Configuration Validation

**Check current configuration:**
```bash
# Test with verbose output
copilot-api start --verbose --port 9999

# Verify token exists
ls -la ~/.local/share/copilot-api/github_token

# Test GitHub API access
curl -H "Authorization: token $(cat ~/.local/share/copilot-api/github_token)" \
  https://api.github.com/user
```

---

**Next Steps:**
- Review [deployment documentation](deployment.md) for production configuration
- Check [authentication guide](auth.md) for token management
- See [architecture documentation](architecture.md) for configuration implementation details