# Testing Guide

This document provides comprehensive testing guidelines specific to the Copilot API project, complementing the existing [`docs/TESTING.md`](TESTING.md) file.

## Overview

The Copilot API project uses Bun's built-in testing framework with a focus on:
- **Unit testing** for individual components and utilities
- **Integration testing** for API endpoints and request flows
- **Service testing** for external API interactions
- **Coverage-driven development** with 80%+ target coverage

## Test Architecture

### Test Organization

```
test/
├── setup.ts              # Global test configuration and utilities
├── run-tests.ts          # Custom test runner with enhanced features
├── README.md             # Test directory documentation
├── api-key-rotation-tests.md       # API key rotation test documentation
├── api-key-rotation-test-summary.md # API key rotation test summary
├── integration/          # Integration tests
│   └── api-key-rotation.test.ts    # API key rotation integration tests
├── lib/                  # Unit tests for utility functions
│   ├── account-manager.test.ts     # Account management tests
│   ├── api-config.test.ts
│   ├── approval.test.ts
│   ├── forward-error.test.ts       # Forward error handling tests
│   ├── http-error.test.ts
│   ├── is-nullish.test.ts
│   ├── models.test.ts
│   ├── paths.test.ts
│   ├── rate-limit.test.ts
│   ├── rotation-logging.test.ts    # Rotation logging tests
│   ├── sleep.test.ts
│   ├── state.test.ts
│   ├── token-parser.test.ts        # Token parser tests
│   ├── token.test.ts
│   ├── tokenizer.test.ts
│   └── vscode-version.test.ts
├── routes/               # Integration tests for API endpoints
│   └── models.test.ts
└── services/             # Service layer tests
    ├── get-vscode-version.test.ts
    └── github/
        ├── get-copilot-token.test.ts
        ├── get-device-code.test.ts
        └── get-user.test.ts
```

### Test Categories

#### 1. Unit Tests (`test/lib/`)

Test isolated functions and utilities without external dependencies.

**New Test Files Added:**
- **`account-manager.test.ts`** - Tests for GitHub account management and rotation
- **`forward-error.test.ts`** - Tests for error forwarding utility
- **`rotation-logging.test.ts`** - Tests for rotation logging functionality
- **`token-parser.test.ts`** - Tests for token parsing utilities

#### 2. Integration Tests (`test/integration/`)

Test complete workflows and API key rotation functionality.

**Integration Test Files:**
- **`api-key-rotation.test.ts`** - Tests for GitHub API key rotation system

**Example: Testing utility functions**
```typescript
// test/lib/is-nullish.test.ts
import { test, expect, describe } from "bun:test"
import { isNullish } from "../../src/lib/is-nullish"

describe("isNullish utility", () => {
  test("should return true for null values", () => {
    expect(isNullish(null)).toBe(true)
    expect(isNullish(undefined)).toBe(true)
  })

  test("should return false for non-nullish values", () => {
    expect(isNullish("")).toBe(false)
    expect(isNullish(0)).toBe(false)
    expect(isNullish(false)).toBe(false)
    expect(isNullish([])).toBe(false)
    expect(isNullish({})).toBe(false)
  })

  test("should handle edge cases", () => {
    expect(isNullish(NaN)).toBe(false)
    expect(isNullish(Infinity)).toBe(false)
  })
})
```

**Example: Testing configuration logic**
```typescript
// test/lib/api-config.test.ts
import { test, expect, describe } from "bun:test"
import { copilotHeaders, copilotBaseUrl } from "../../src/lib/api-config"

describe("API Configuration", () => {
  test("should generate correct copilot headers", () => {
    const mockState = {
      copilotToken: "test-token",
      vsCodeVersion: "1.95.0"
    }
    
    const headers = copilotHeaders(mockState as any)
    
    expect(headers.Authorization).toBe("Bearer test-token")
    expect(headers["editor-version"]).toBe("vscode/1.95.0")
    expect(headers["copilot-integration-id"]).toBe("vscode-chat")
  })

  test("should add vision header when enabled", () => {
    const mockState = { copilotToken: "test-token", vsCodeVersion: "1.95.0" }
    const headers = copilotHeaders(mockState as any, true)
    
    expect(headers["copilot-vision-request"]).toBe("true")
  })

  test("should generate correct base URLs", () => {
    expect(copilotBaseUrl({ accountType: "individual" } as any))
      .toBe("https://api.individual.githubcopilot.com")
      
    expect(copilotBaseUrl({ accountType: "business" } as any))
      .toBe("https://api.business.githubcopilot.com")
  })
})
```

#### 2. Integration Tests (`test/routes/`)

Test complete API endpoints including request processing and response formatting.

**Example: Testing API endpoints**
```typescript
// test/routes/models.test.ts
import { test, expect, describe, beforeEach } from "bun:test"
import { server } from "../../src/server"
import { state } from "../../src/lib/state"

describe("Models API Integration", () => {
  beforeEach(() => {
    // Reset state before each test
    state.models = {
      object: "list",
      data: [
        {
          id: "gpt-4",
          object: "model",
          created: 1677652288,
          owned_by: "github-copilot",
          capabilities: {
            family: "gpt-4",
            limits: {
              max_prompt_tokens: 128000,
              max_output_tokens: 4096
            },
            object: "model_capabilities",
            supports_parallel_tool_calls: false,
            supports_vision: true
          }
        }
      ]
    }
  })

  test("should return models list on GET /models", async () => {
    const request = new Request("http://localhost:4141/models", {
      method: "GET"
    })

    const response = await server.fetch(request)
    
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/json")
    
    const data = await response.json()
    expect(data).toHaveProperty("object", "list")
    expect(data).toHaveProperty("data")
    expect(Array.isArray(data.data)).toBe(true)
  })

  test("should return models list on GET /v1/models", async () => {
    const request = new Request("http://localhost:4141/v1/models", {
      method: "GET"
    })

    const response = await server.fetch(request)
    expect(response.status).toBe(200)
  })

  test("should handle CORS preflight requests", async () => {
    const request = new Request("http://localhost:4141/models", {
      method: "OPTIONS"
    })

    const response = await server.fetch(request)
    expect(response.headers.get("access-control-allow-origin")).toBe("*")
  })
})
```

#### 3. Service Tests (`test/services/`)

Test external service integrations with proper mocking.

**Example: Testing GitHub service with mocks**
```typescript
// test/services/github/get-device-code.test.ts
import { test, expect, describe, mock, beforeEach } from "bun:test"
import { getDeviceCode } from "../../../src/services/github/get-device-code"

describe("GitHub Device Code Service", () => {
  let mockFetch: any

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        device_code: "device_123",
        user_code: "ABCD-EFGH",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5
      })
    }))
    
    global.fetch = mockFetch
  })

  test("should request device code with correct parameters", async () => {
    const result = await getDeviceCode()
    
    expect(mockFetch).toHaveBeenCalledWith(
      "https://github.com/login/device/code",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json"
        }),
        body: expect.stringContaining('"client_id"')
      })
    )
    
    expect(result).toEqual({
      device_code: "device_123",
      user_code: "ABCD-EFGH",
      verification_uri: "https://github.com/login/device",
      expires_in: 900,
      interval: 5
    })
  })

  test("should handle API errors", async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "invalid_request" })
    }))

    await expect(getDeviceCode()).rejects.toThrow("Failed to get device code")
  })
})
```

## Testing Patterns

### State Management Testing

```typescript
// test/lib/state.test.ts
import { test, expect, describe, beforeEach } from "bun:test"
import { state } from "../../src/lib/state"

describe("Application State", () => {
  beforeEach(() => {
    // Reset state to defaults
    Object.assign(state, {
      githubToken: undefined,
      copilotToken: undefined,
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: false,
      rateLimitSeconds: undefined,
      lastRequestTimestamp: undefined
    })
  })

  test("should have correct default values", () => {
    expect(state.accountType).toBe("individual")
    expect(state.manualApprove).toBe(false)
    expect(state.rateLimitWait).toBe(false)
  })

  test("should allow state mutations", () => {
    state.githubToken = "test-token"
    state.manualApprove = true
    
    expect(state.githubToken).toBe("test-token")
    expect(state.manualApprove).toBe(true)
  })
})
```

### Error Handling Testing

```typescript
// test/lib/http-error.test.ts
import { test, expect, describe } from "bun:test"
import { HTTPError } from "../../src/lib/http-error"
import { createMockResponse } from "../setup"

describe("HTTPError", () => {
  test("should create error with message and response", () => {
    const mockResponse = createMockResponse({ error: "test" }, 400)
    const error = new HTTPError("Test error", mockResponse)
    
    expect(error.message).toBe("Test error")
    expect(error.response).toBe(mockResponse)
    expect(error.name).toBe("HTTPError")
    expect(error).toBeInstanceOf(Error)
  })

  test("should preserve error properties", () => {
    const mockResponse = createMockResponse({ error: "unauthorized" }, 401)
    const error = new HTTPError("Auth failed", mockResponse)
    
    expect(error.response.status).toBe(401)
    expect(error.stack).toBeDefined()
  })
})
```

### Rate Limiting Testing

```typescript
// test/lib/rate-limit.test.ts
import { test, expect, describe, beforeEach } from "bun:test"
import { checkRateLimit } from "../../src/lib/rate-limit"
import { HTTPError } from "../../src/lib/http-error"

describe("Rate Limiting", () => {
  let mockState: any

  beforeEach(() => {
    mockState = {
      rateLimitSeconds: undefined,
      rateLimitWait: false,
      lastRequestTimestamp: undefined
    }
  })

  test("should allow requests when rate limiting is disabled", async () => {
    await expect(checkRateLimit(mockState)).resolves.toBeUndefined()
  })

  test("should enforce rate limits", async () => {
    mockState.rateLimitSeconds = 30
    mockState.lastRequestTimestamp = Date.now()
    
    await expect(checkRateLimit(mockState)).rejects.toThrow(HTTPError)
  })

  test("should wait when rate limit wait is enabled", async () => {
    mockState.rateLimitSeconds = 1
    mockState.rateLimitWait = true
    mockState.lastRequestTimestamp = Date.now()
    
    const start = Date.now()
    await checkRateLimit(mockState)
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeGreaterThan(500) // Should have waited
  })
})
```

## Mock Data and Utilities

### Test Setup Utilities

The [`test/setup.ts`](../test/setup.ts) file provides shared utilities:

```typescript
// Mock response creator
export function createMockResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  })
}

// Mock request creator  
export function createMockRequest(
  method: string, 
  url: string, 
  body?: any, 
  headers?: Record<string, string>
): Request {
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  })
}

// Mock data objects
export const mockGitHubUser = {
  login: "testuser",
  id: 12345,
  name: "Test User"
}

export const mockDeviceCodeResponse = {
  device_code: "device_123",
  user_code: "ABCD-EFGH", 
  verification_uri: "https://github.com/login/device",
  expires_in: 900,
  interval: 5
}

export const mockCopilotTokenResponse = {
  token: "copilot_token_123",
  refresh_in: 3600
}
```

### Advanced Mocking Patterns

```typescript
// Mock module with complex behavior
import { mock } from "bun:test"

const mockFetchWithRetries = mock((url: string) => {
  if (url.includes("fail-once")) {
    // First call fails, subsequent calls succeed
    if (mockFetchWithRetries.mock.calls.length === 1) {
      return Promise.resolve({ ok: false, status: 500 })
    }
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  })
})

// Mock with state tracking
let requestCount = 0
const mockFetchWithCounter = mock(() => {
  requestCount++
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ count: requestCount })
  })
})
```

## Testing Streaming Responses

```typescript
// test/routes/chat-completions.test.ts
import { test, expect, describe } from "bun:test"
import { server } from "../../src/server"

describe("Chat Completions Streaming", () => {
  test("should handle streaming responses", async () => {
    const request = new Request("http://localhost:4141/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
        stream: true
      })
    })

    const response = await server.fetch(request)
    
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    
    // Test streaming data
    const reader = response.body?.getReader()
    if (reader) {
      const { value, done } = await reader.read()
      expect(done).toBe(false)
      expect(value).toBeDefined()
      
      const chunk = new TextDecoder().decode(value)
      expect(chunk).toContain("data:")
    }
  })
})
```

## Testing Authentication Flow

```typescript
// test/services/github/auth-flow.test.ts
import { test, expect, describe, mock } from "bun:test"
import { setupGitHubToken } from "../../../src/lib/token"

describe("GitHub Authentication Flow", () => {
  test("should complete full authentication flow", async () => {
    // Mock file system operations
    const mockReadFile = mock(() => Promise.reject(new Error("File not found")))
    const mockWriteFile = mock(() => Promise.resolve())
    
    // Mock GitHub API calls
    const mockGetDeviceCode = mock(() => Promise.resolve({
      device_code: "device_123",
      user_code: "ABCD-EFGH",
      verification_uri: "https://github.com/login/device",
      expires_in: 900,
      interval: 5
    }))
    
    const mockPollAccessToken = mock(() => Promise.resolve("access_token_123"))
    const mockGetUser = mock(() => Promise.resolve({ login: "testuser" }))

    // Execute authentication flow
    await setupGitHubToken({ force: true })
    
    // Verify all steps were called
    expect(mockGetDeviceCode).toHaveBeenCalled()
    expect(mockPollAccessToken).toHaveBeenCalled()
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("github_token"),
      "access_token_123"
    )
  })
})
```

## Performance Testing

```typescript
// test/performance/response-time.test.ts
import { test, expect, describe } from "bun:test"
import { server } from "../../src/server"

describe("Performance Tests", () => {
  test("should respond to health check within 100ms", async () => {
    const start = performance.now()
    
    const request = new Request("http://localhost:4141/")
    const response = await server.fetch(request)
    
    const duration = performance.now() - start
    
    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(100)
  })

  test("should handle concurrent requests", async () => {
    const requests = Array.from({ length: 10 }, () => 
      server.fetch(new Request("http://localhost:4141/"))
    )
    
    const responses = await Promise.all(requests)
    
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
  })
})
```

## Test Configuration

### Bun Test Configuration

**bunfig.toml:**
```toml
[test]
coverage = true
timeout = 30000
bail = false
preload = ["./test/setup.ts"]
coverage-dir = "./coverage"
coverage-reporter = ["text", "lcov", "html"]
coverage-threshold = 80

# Test file patterns
testMatch = ["**/*.test.ts"]
testIgnore = ["node_modules/**", "dist/**"]
```

### Custom Test Runner

The project includes a custom test runner ([`test/run-tests.ts`](../test/run-tests.ts)) with enhanced features:

```typescript
// test/run-tests.ts
import { spawn } from "bun"

async function runTests() {
  console.log("🧪 Running Copilot API tests...")
  
  const testProcess = spawn({
    cmd: ["bun", "test", "--coverage"],
    stdout: "pipe",
    stderr: "pipe"
  })
  
  // Handle output and provide enhanced reporting
  // ...
}

if (import.meta.main) {
  await runTests()
}
```

## Continuous Integration

### GitHub Actions Test Configuration

The project includes CI/CD testing in `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - run: bun install
      - run: bun test --coverage
      - run: bun run lint
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Test Quality Guidelines

### Test Naming

```typescript
// Good test names
test("should return 401 when GitHub token is missing")
test("should cache VS Code version on successful detection")
test("should handle rate limit with wait enabled")

// Poor test names  
test("token test")
test("handles errors")
test("works correctly")
```

### Test Structure (AAA Pattern)

```typescript
test("should calculate token count correctly", () => {
  // Arrange
  const messages = [
    { role: "user", content: "Hello world" },
    { role: "assistant", content: "Hi there!" }
  ]
  
  // Act
  const tokenCount = getTokenCount(messages)
  
  // Assert
  expect(tokenCount).toBeGreaterThan(0)
  expect(typeof tokenCount).toBe("number")
})
```

### Test Independence

```typescript
describe("Token Management", () => {
  beforeEach(() => {
    // Reset state before each test
    state.githubToken = undefined
    state.copilotToken = undefined
  })

  test("should setup GitHub token", async () => {
    // Test implementation - won't affect other tests
  })
})
```

## Coverage Analysis

### Viewing Coverage Reports

```bash
# Generate coverage report
bun run test:coverage

# Open HTML report
open coverage/index.html

# View text summary
cat coverage/lcov.info
```

### Coverage Targets

- **Overall coverage**: 80% minimum
- **New features**: 90% minimum
- **Critical paths**: 95% minimum
- **Utilities**: 100% target

### Improving Coverage

1. **Identify uncovered code**:
   ```bash
   bun test --coverage --reporter=text
   ```

2. **Add missing tests**:
   - Error conditions
   - Edge cases
   - Integration paths

3. **Remove dead code**:
   - Unused functions
   - Unreachable branches

## Debugging Tests

### Debug Individual Tests

```bash
# Run specific test file
bun test test/lib/state.test.ts

# Run with pattern matching
bun test --grep "rate limit"

# Verbose output
VERBOSE_TESTS=true bun test

# Debug with console output
bun test --verbose
```

### Test Debugging Utilities

```typescript
// Add debug output in tests
import { test, expect } from "bun:test"

test("debug example", () => {
  const result = someFunction()
  console.log("Debug result:", result) // Will show in verbose mode
  expect(result).toBeDefined()
})
```

---

**Next Steps:**
- Review existing [`docs/TESTING.md`](TESTING.md) for comprehensive testing framework details
- Check [`test/README.md`](../test/README.md) for test directory structure
- See [contributing documentation](contributing.md) for development workflow integration