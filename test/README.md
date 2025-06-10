# Test Directory

This directory contains all test files for the Copilot API project using Bun's built-in testing framework.

## Directory Structure

```
test/
├── README.md             # This file
├── setup.ts              # Global test configuration and utilities
├── run-tests.ts          # Custom test runner script
├── api-key-rotation-tests.md       # API key rotation test documentation
├── api-key-rotation-test-summary.md # API key rotation test summary
├── integration/          # Integration tests
│   └── api-key-rotation.test.ts    # API key rotation integration tests
├── lib/                  # Unit tests for library modules
│   ├── account-manager.test.ts     # Account management tests
│   ├── api-config.test.ts          # API configuration tests
│   ├── approval.test.ts            # Manual approval tests
│   ├── forward-error.test.ts       # Error forwarding tests
│   ├── http-error.test.ts          # HTTP error handling tests
│   ├── is-nullish.test.ts          # Utility function tests
│   ├── models.test.ts              # Models data tests
│   ├── paths.test.ts               # Path utility tests
│   ├── rate-limit.test.ts          # Rate limiting tests
│   ├── rotation-logging.test.ts    # Rotation logging tests
│   ├── sleep.test.ts               # Sleep utility tests
│   ├── state.test.ts               # State management tests
│   ├── token-parser.test.ts        # Token parser tests
│   ├── token.test.ts               # Token management tests
│   ├── tokenizer.test.ts           # Tokenizer tests
│   └── vscode-version.test.ts      # VS Code version tests
├── routes/               # Integration tests for API routes
│   └── models.test.ts    # Models endpoint tests
└── services/             # Service layer tests
    ├── get-vscode-version.test.ts  # VS Code version service tests
    └── github/
        ├── get-copilot-token.test.ts # Copilot token service tests
        ├── get-device-code.test.ts   # Device code service tests
        └── get-user.test.ts          # GitHub user service tests
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

#### `account-manager.test.ts`
Tests for the GitHub account management system:
- Account rotation functionality
- Multiple account handling
- Account validation and token management
- Error handling for invalid accounts

#### `api-config.test.ts`
Tests for API configuration utilities:
- Copilot API headers generation
- Base URL configuration for individual/business accounts
- Vision request header handling
- API version and user agent configuration

#### `approval.test.ts`
Tests for manual request approval system:
- Interactive approval prompts
- Approval/rejection handling
- User input validation
- Timeout handling

#### `forward-error.test.ts`
Tests for error forwarding functionality:
- Error propagation between services
- Error message formatting
- Stack trace preservation
- Custom error handling

#### `rotation-logging.test.ts`
Tests for rotation logging system:
- Log rotation functionality
- Account rotation event logging
- Log file management
- Error logging and recovery

#### `token-parser.test.ts`
Tests for token parsing utilities:
- GitHub token validation
- Token format detection
- Token expiration checking
- Token metadata extraction

#### `state.test.ts`
Tests for the global application state management:
- Default state values
- State mutations and updates
- Rate limiting configuration
- Account manager integration

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

### Integration Tests (`integration/`)

#### `api-key-rotation.test.ts`
Tests for the API key rotation system:
- Multiple GitHub account configuration
- Account rotation on rate limits or errors
- Token refresh and validation
- Error recovery and fallback mechanisms
- Account health monitoring

### Route Tests (`routes/`)

#### `models.test.ts`
Tests for the `/v1/models` API endpoint:
- Successful model list retrieval
- Authorization header handling
- Error responses for invalid requests
- CORS preflight request handling

### Service Tests (`services/`)

#### `get-vscode-version.test.ts`
Tests for VS Code version detection service:
- Version detection from system
- Fallback version handling
- Error cases and recovery
- Version caching

#### GitHub Service Tests (`services/github/`)

**`get-copilot-token.test.ts`**
- Copilot token retrieval from GitHub
- Token refresh mechanisms
- Error handling for invalid tokens
- Rate limiting compliance

**`get-device-code.test.ts`**
- OAuth device code flow initiation
- Device code format validation
- Timeout and error handling
- User verification process

**`get-user.test.ts`**
- GitHub user information retrieval
- Authentication validation
- User profile data handling
- Error cases for invalid tokens

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