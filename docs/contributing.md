# Contributing to Copilot API

This guide covers the developer workflow and technical contribution guidelines for the Copilot API project.

## Overview

The Copilot API project welcomes contributions that improve functionality, documentation, testing, and overall code quality. This document focuses on the technical aspects of contributing - please also review the root [`CONTRIBUTING.md`](../CONTRIBUTING.md) for legal requirements and compliance guidelines.

## Development Environment Setup

### Prerequisites

- **Bun >= 1.2.x** (recommended) or Node.js >= 18
- **Git** for version control
- **VS Code** (recommended) with TypeScript support
- **GitHub account** with Copilot access for testing

### Initial Setup

```bash
# Fork and clone the repository
git clone https://github.com/ekartashov/copilot-api.git
cd copilot-api

# Install dependencies
bun install

# Start development server
bun run dev
```

### Project Structure

```
copilot-api/
├── src/                    # Source code
│   ├── main.ts            # CLI entry point
│   ├── server.ts          # Hono server setup
│   ├── auth.ts            # Authentication command
│   ├── lib/               # Utility libraries
│   ├── routes/            # API route handlers
│   └── services/          # External service integrations
├── test/                  # Test files
│   ├── lib/               # Unit tests
│   ├── routes/            # Integration tests
│   └── services/          # Service tests
├── docs/                  # Documentation
├── dist/                  # Built output (generated)
└── coverage/              # Test coverage reports (generated)
```

### Development Scripts

```bash
# Development with auto-reload
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Run tests with coverage
bun run test:coverage

# Watch tests during development
bun run test:watch

# Lint code
bun run lint

# Format code
bunx prettier --write .
```

## Code Style and Standards

### TypeScript Configuration

The project uses strict TypeScript configuration:

```typescript
// tsconfig.json highlights
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### ESLint Configuration

```typescript
// eslint.config.ts
import echristian from '@echristian/eslint-config'

export default echristian({
  typescript: true,
  ignores: ['dist/', 'coverage/', 'node_modules/']
})
```

### Code Formatting

- **Prettier** for consistent formatting
- **2-space indentation**
- **Semicolons required**
- **Single quotes for strings**
- **Trailing commas where valid**

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `rate-limit.ts`)
- **Functions**: `camelCase` (e.g., `setupCopilotToken`)
- **Classes**: `PascalCase` (e.g., `HTTPError`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `GITHUB_CLIENT_ID`)
- **Types/Interfaces**: `PascalCase` (e.g., `ChatCompletionsPayload`)

## Testing Guidelines

### Test Structure

The project uses Bun's built-in testing framework:

```typescript
import { test, expect, describe, beforeEach } from "bun:test"

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup for each test
  })

  test("should behave as expected", () => {
    // Arrange
    const input = "test input"
    
    // Act
    const result = functionUnderTest(input)
    
    // Assert
    expect(result).toBe("expected output")
  })
})
```

### Test Categories

#### Unit Tests (`test/lib/`)

Test individual functions and utilities:

```typescript
// test/lib/is-nullish.test.ts
import { test, expect, describe } from "bun:test"
import { isNullish } from "../../src/lib/is-nullish"

describe("isNullish", () => {
  test("should return true for null", () => {
    expect(isNullish(null)).toBe(true)
  })

  test("should return true for undefined", () => {
    expect(isNullish(undefined)).toBe(true)
  })

  test("should return false for empty string", () => {
    expect(isNullish("")).toBe(false)
  })
})
```

#### Integration Tests (`test/routes/`)

Test API endpoints and request handling:

```typescript
// test/routes/models.test.ts
import { test, expect, describe } from "bun:test"
import { server } from "../../src/server"

describe("Models API", () => {
  test("should return models list", async () => {
    const request = new Request("http://localhost:4141/models", {
      method: "GET"
    })

    const response = await server.fetch(request)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty("data")
  })
})
```

#### Service Tests (`test/services/`)

Test external service integrations with mocking:

```typescript
// test/services/github/get-user.test.ts
import { test, expect, describe, mock } from "bun:test"

// Mock the fetch function
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ login: "testuser" })
}))

global.fetch = mockFetch as any

describe("GitHub User Service", () => {
  test("should fetch user data", async () => {
    const user = await getGitHubUser()
    expect(user.login).toBe("testuser")
  })
})
```

### Test Utilities

Use shared test utilities from `test/setup.ts`:

```typescript
import { 
  createMockResponse, 
  createMockRequest,
  mockGitHubUser 
} from "../setup"

// Create mock responses
const response = createMockResponse({ data: "test" }, 200)

// Use predefined mock data
expect(result.user).toEqual(mockGitHubUser)
```

### Coverage Requirements

- **Minimum coverage**: 80%
- **New features**: Must include comprehensive tests
- **Bug fixes**: Should include regression tests
- **Critical paths**: Aim for 100% coverage

## Development Workflow

### Branch Strategy

1. **Fork** the repository to your GitHub account
2. **Create feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes** with tests and documentation
4. **Submit pull request** to `main` branch

### Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Feature additions
git commit -m "feat: add manual request approval mode"

# Bug fixes  
git commit -m "fix: handle expired tokens gracefully"

# Documentation
git commit -m "docs: update API reference for new endpoints"

# Tests
git commit -m "test: add coverage for rate limiting logic"

# Refactoring
git commit -m "refactor: extract token management to separate module"
```

### Pull Request Process

1. **Ensure tests pass**:
   ```bash
   bun test
   bun run lint
   ```

2. **Update documentation** if needed

3. **Add changeset** if applicable:
   ```bash
   bunx changeset
   ```

4. **Create pull request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots/examples if applicable
   - Confirmation of legal compliance

### Code Review Checklist

**For Authors:**
- [ ] Tests pass and coverage is maintained
- [ ] Code follows project style guidelines
- [ ] Documentation is updated
- [ ] No proprietary code included
- [ ] Commit messages follow conventional format

**For Reviewers:**
- [ ] Code quality and maintainability
- [ ] Test coverage and quality
- [ ] Security considerations
- [ ] Performance implications
- [ ] API compatibility

## Architecture Guidelines

### Project Structure Principles

#### Clean Architecture Layers

```
├── main.ts              # CLI entry point
├── server.ts            # HTTP server setup
├── auth.ts              # Authentication command
├── lib/                 # Pure utility functions
│   ├── api-config.ts    # Configuration constants
│   ├── state.ts         # Application state
│   └── *.ts             # Other utilities
├── routes/              # HTTP route handlers
│   └── */route.ts       # Route definitions
├── services/            # External service clients
│   ├── github/          # GitHub API services
│   └── copilot/         # Copilot API services
```

#### Dependency Guidelines

- **lib/** - No external dependencies except Node.js built-ins
- **services/** - Can depend on lib/ and external APIs
- **routes/** - Can depend on lib/ and services/
- **Circular dependencies** - Not allowed

### Error Handling

#### Custom Error Types

```typescript
// src/lib/http-error.ts
export class HTTPError extends Error {
  constructor(
    message: string,
    public response: Response
  ) {
    super(message)
    this.name = "HTTPError"
  }
}
```

#### Error Propagation

```typescript
// Services should throw HTTPError for API failures
export async function getDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new HTTPError("Failed to get device code", response)
  }
  
  return await response.json()
}

// Routes should handle and translate errors
export async function handleCompletion(c: Context) {
  try {
    const result = await createChatCompletions(payload)
    return c.json(result)
  } catch (error) {
    if (error instanceof HTTPError) {
      return c.json({ error: "API request failed" }, 500)
    }
    throw error
  }
}
```

### State Management

#### Global State Pattern

```typescript
// src/lib/state.ts
export interface State {
  githubToken?: string
  copilotToken?: string
  // ... other state
}

export const state: State = {
  // default values
}
```

#### State Mutations

- **Centralized**: All state changes through dedicated functions
- **Immutable where possible**: Avoid direct property mutation
- **Thread-safe**: No concurrent modification assumptions

### API Design

#### Request/Response Translation

```typescript
// Always translate between OpenAI and Copilot formats
const intoCopilotMessage = (message: Message) => {
  if (typeof message.content === "string") return false

  for (const part of message.content) {
    if (part.type === "input_image") part.type = "image_url"
  }
}
```

#### Streaming Support

```typescript
// Support both streaming and non-streaming responses
if (payload.stream) {
  return streamSSE(c, async (stream) => {
    for await (const chunk of response) {
      await stream.writeSSE(chunk as SSEMessage)
    }
  })
}

return c.json(response)
```

## Adding New Features

### Feature Development Process

1. **Plan the feature**:
   - Write feature specification
   - Design API if applicable
   - Consider backwards compatibility

2. **Implement incrementally**:
   - Start with types and interfaces
   - Add core logic with tests
   - Add API endpoints if needed
   - Update documentation

3. **Test thoroughly**:
   - Unit tests for logic
   - Integration tests for APIs
   - Manual testing with real GitHub tokens

### Example: Adding a New Endpoint

1. **Define types**:
   ```typescript
   // src/services/copilot/new-feature.ts
   export interface NewFeaturePayload {
     input: string
     options?: FeatureOptions
   }
   
   export interface NewFeatureResponse {
     result: string
     metadata: object
   }
   ```

2. **Implement service**:
   ```typescript
   export async function createNewFeature(
     payload: NewFeaturePayload
   ): Promise<NewFeatureResponse> {
     const response = await fetch(`${copilotBaseUrl(state)}/new-feature`, {
       method: "POST",
       headers: copilotHeaders(state),
       body: JSON.stringify(payload),
     })

     if (!response.ok) {
       throw new HTTPError("Failed to create new feature", response)
     }

     return await response.json()
   }
   ```

3. **Add route handler**:
   ```typescript
   // src/routes/new-feature/handler.ts
   export async function handleNewFeature(c: Context) {
     const payload = await c.req.json<NewFeaturePayload>()
     const result = await createNewFeature(payload)
     return c.json(result)
   }
   ```

4. **Register route**:
   ```typescript
   // src/routes/new-feature/route.ts
   import { Hono } from "hono"
   import { handleNewFeature } from "./handler"

   export const newFeatureRoutes = new Hono()
   newFeatureRoutes.post("/", handleNewFeature)
   ```

5. **Add to server**:
   ```typescript
   // src/server.ts
   import { newFeatureRoutes } from "./routes/new-feature/route"
   
   server.route("/new-feature", newFeatureRoutes)
   server.route("/v1/new-feature", newFeatureRoutes)
   ```

6. **Add tests**:
   ```typescript
   // test/routes/new-feature.test.ts
   describe("New Feature API", () => {
     test("should handle new feature request", async () => {
       const request = new Request("http://localhost:4141/new-feature", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ input: "test" })
       })

       const response = await server.fetch(request)
       expect(response.status).toBe(200)
     })
   })
   ```

7. **Update documentation**:
   - Add endpoint to [`docs/api.md`](api.md)
   - Update examples and usage

## Common Development Tasks

### Adding a New Library Function

```typescript
// src/lib/new-utility.ts
/**
 * Description of what the function does
 * @param input - Description of parameter
 * @returns Description of return value
 */
export function newUtility(input: string): string {
  // Implementation
  return input.toUpperCase()
}
```

```typescript
// test/lib/new-utility.test.ts
import { test, expect, describe } from "bun:test"
import { newUtility } from "../../src/lib/new-utility"

describe("newUtility", () => {
  test("should convert input to uppercase", () => {
    expect(newUtility("hello")).toBe("HELLO")
  })
})
```

### Updating Dependencies

```bash
# Check for updates
bun update

# Update specific package
bun add package-name@latest

# Update dev dependencies
bun add -d package-name@latest
```

### Adding Environment Variables

1. **Add to CLI interface**:
   ```typescript
   // src/main.ts
   const newOption = process.env.NEW_OPTION || args["new-option"]
   ```

2. **Update configuration docs**:
   ```markdown
   <!-- docs/config.md -->
   | `NEW_OPTION` | Description | Default | Example |
   ```

3. **Add to Docker files**:
   ```dockerfile
   ENV NEW_OPTION=""
   ```

## Debugging and Troubleshooting

### Development Debugging

```bash
# Enable verbose logging
bun run dev -- start --verbose

# Debug specific test
bun test --grep "test name"

# Check build output
bun run build && ls -la dist/
```

### Common Issues

#### 1. Import Resolution
```typescript
// Use path aliases defined in tsconfig.json
import { state } from "~/lib/state"  // ✅
import { state } from "../lib/state" // ❌ (relative imports)
```

#### 2. Test Mocking
```typescript
// Mock before imports
import { mock } from "bun:test"
const mockFetch = mock(() => Promise.resolve())
global.fetch = mockFetch as any

// Then import modules that use fetch
import { getDeviceCode } from "../../src/services/github/get-device-code"
```

#### 3. Type Errors
```typescript
// Use proper type assertions
const response = await fetch(url) as Response  // ❌
const response: Response = await fetch(url)   // ✅
```

## Performance Considerations

### Optimization Guidelines

1. **Minimize external requests** - Cache when possible
2. **Use streaming** for large responses
3. **Implement proper timeouts** for external calls
4. **Avoid blocking operations** in request handlers

### Memory Management

```typescript
// Clean up intervals and timeouts
const interval = setInterval(() => {}, 1000)

// In shutdown handler
clearInterval(interval)
```

### Bundle Size

```bash
# Check bundle size
bun run build
ls -lh dist/

# Analyze dependencies
bunx bundle-analyzer dist/main.js
```

## Release Process

### Version Management

The project uses semantic versioning:

```bash
# Create changeset for changes
bunx changeset

# Version bump and changelog generation
bunx changeset version

# Publish release
bun run release
```

### Pre-release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Changelog is accurate
- [ ] Legal compliance confirmed
- [ ] Performance impact assessed

---

**Next Steps:**
- Review the [testing documentation](testing.md) for detailed test guidelines
- Check [architecture documentation](architecture.md) for system design details
- See the root [CONTRIBUTING.md](../CONTRIBUTING.md) for legal and compliance requirements