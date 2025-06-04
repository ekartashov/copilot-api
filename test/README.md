# Test Directory

This directory contains all test files for the Copilot API project using Bun's built-in testing framework.

## Directory Structure

```
test/
├── README.md             # This file
├── setup.ts              # Global test configuration and utilities
├── run-tests.ts          # Custom test runner script
├── lib/                  # Unit tests for library modules
│   ├── state.test.ts     # State management tests
│   ├── http-error.test.ts # HTTP error handling tests
│   ├── is-nullish.test.ts # Utility function tests
│   └── token.test.ts     # Token management tests
└── routes/               # Integration tests for API routes
    └── models.test.ts    # Models endpoint tests
```

## Quick Commands

```bash
# Run all tests
bun test

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch

# Run specific test file
bun test test/lib/state.test.ts

# Run custom test runner
bun run test/run-tests.ts
```

## Test Files Overview

### Unit Tests (`lib/`)

#### `state.test.ts`
Tests for the global application state management:
- Default state values
- State mutations and updates
- Rate limiting configuration
- Vision capabilities flag

#### `http-error.test.ts`
Tests for HTTP error handling class:
- Error creation with different status codes
- Response object preservation
- Error throwing and catching mechanisms
- Custom error messages

#### `is-nullish.test.ts`
Tests for the nullish value utility function:
- Null and undefined detection
- Type guard functionality
- Edge cases (empty strings, zero, false, etc.)
- Complex object handling

#### `token.test.ts`
Tests for GitHub and Copilot token management:
- Token setup and refresh mechanisms
- Authentication flow simulation
- Error handling for network failures
- Token persistence to filesystem

### Integration Tests (`routes/`)

#### `models.test.ts`
Tests for the `/v1/models` API endpoint:
- Successful model list retrieval
- Authorization header handling
- Error responses for invalid requests
- CORS preflight request handling

## Test Utilities

### `setup.ts`
Provides global test configuration and utilities:

#### Mock Functions
- `createMockResponse(data, status)` - Creates mock HTTP responses
- `createMockRequest(method, url, body, headers)` - Creates mock HTTP requests

#### Mock Data
- `mockGitHubUser` - Sample GitHub user data
- `mockDeviceCodeResponse` - OAuth device code flow data
- `mockCopilotTokenResponse` - Copilot token response data
- `mockModelsResponse` - Models API response data

#### Environment Setup
- Sets `NODE_ENV=test`
- Configures console output for cleaner test runs
- Provides console restoration utilities

### `run-tests.ts`
Custom test runner with additional features:
- Enhanced output formatting
- Optional coverage report opening
- Error handling and exit codes

## Writing New Tests

### 1. Choose the Right Location
- **Unit tests**: Place in `lib/` directory, named `[module-name].test.ts`
- **Integration tests**: Place in `routes/` directory for API endpoints
- **Service tests**: Create `services/` directory if testing external service integrations

### 2. Follow Naming Conventions
- Test files: `*.test.ts`
- Test descriptions: Use "should" statements
- Test groups: Use descriptive `describe()` blocks

### 3. Use Test Utilities
```typescript
import { test, expect, describe } from "bun:test"
import { createMockResponse, mockGitHubUser } from "../setup"

describe("New Feature", () => {
  test("should behave correctly", () => {
    // Test implementation
  })
})
```

### 4. Mock External Dependencies
```typescript
import { mock } from "bun:test"

const mockExternalFunction = mock(() => "mocked value")

mock.module("external-package", () => ({
  externalFunction: mockExternalFunction
}))
```

## Best Practices

### Test Structure
1. **Arrange**: Set up test data and conditions
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcomes

### Test Isolation
- Use `beforeEach()` and `afterEach()` for setup/cleanup
- Reset global state between tests
- Clear mocks between test runs

### Descriptive Tests
```typescript
// Good
test("should return 401 when authorization header is missing", () => {})

// Less clear
test("handles auth", () => {})
```

### Error Testing
```typescript
// Test both success and failure cases
test("should handle successful token refresh", async () => {})
test("should handle token refresh failure", async () => {})
```

## Debugging Tests

### Enable Verbose Output
```bash
VERBOSE_TESTS=true bun test
```

### Run Single Test
```bash
bun test --grep "specific test name"
```

### Inspect Coverage
```bash
bun run test:coverage
open coverage/index.html
```

## Common Issues

### Mock Not Working
Ensure mocks are set up before the module imports:
```typescript
// Mock first
mock.module("module-name", () => ({}))

// Then import
import { functionToTest } from "../../src/module"
```

### Async Test Issues
Always handle promises properly:
```typescript
test("async test", async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### State Pollution
Reset state between tests:
```typescript
beforeEach(() => {
  state.reset() // or manually reset properties
})
```

## Contributing

When adding tests:
1. Ensure tests are in the correct directory
2. Follow existing naming and structure patterns
3. Add both positive and negative test cases
4. Update this README if adding new patterns
5. Maintain or improve code coverage

For more detailed information, see [docs/TESTING.md](../docs/TESTING.md).