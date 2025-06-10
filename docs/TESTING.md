# Testing Guide

This document provides comprehensive information about the testing framework implemented for the Copilot API project.

## Overview

The Copilot API uses [Bun's built-in testing framework](https://bun.sh/docs/cli/test) for all testing needs. This provides fast execution, TypeScript support out of the box, built-in coverage reporting, and excellent developer experience.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- Bun >= 1.2.x installed
- Dependencies installed: `bun install`

### Run All Tests
```bash
bun test
```

### Run Tests with Coverage
```bash
bun run test:coverage
```

### Watch Mode (for development)
```bash
bun run test:watch
```

## Test Structure

```
test/
├── setup.ts              # Global test setup and utilities
├── run-tests.ts          # Custom test runner script
├── lib/                  # Unit tests for library modules
│   ├── state.test.ts
│   ├── http-error.test.ts
│   ├── is-nullish.test.ts
│   └── token.test.ts
└── routes/               # Integration tests for API routes
    └── models.test.ts
```

### Test Configuration

#### `bunfig.toml`
Main test configuration file:
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

#### `test/setup.ts`
Global test setup that:
- Sets test environment variables
- Provides console mocking for cleaner test output
- Exports common test utilities and mock data
- Configures global test state

## Running Tests

### Available Test Scripts

| Command | Description |
|---------|-------------|
| `bun test` | Run all tests (unit, integration, and service tests) |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage report |
| `bun run test:ci` | Run tests for CI with JSON output |

**Note**: The main `bun test` command runs a comprehensive test suite that includes:
- All unit tests in `test/lib/`
- All route tests in `test/routes/`
- All service tests in `test/services/`
- All integration tests in `test/integration/`

### Custom Test Runner

Use the custom test runner for enhanced development experience:

```bash
# Run with custom runner
bun run test/run-tests.ts

# Open coverage report after running
bun run test/run-tests.ts --open-coverage
```

### Filtering Tests

```bash
# Run specific test file
bun test test/lib/state.test.ts

# Run tests matching pattern
bun test --grep "HTTPError"

# Run tests for specific directory
bun test test/lib/
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect, describe } from "bun:test"

describe("Feature Name", () => {
  test("should behave as expected", () => {
    const result = someFunction()
    expect(result).toBe(expectedValue)
  })
})
```

### Using Test Utilities

The `test/setup.ts` file provides several utilities:

```typescript
import { 
  createMockResponse, 
  createMockRequest,
  mockGitHubUser,
  mockCopilotTokenResponse 
} from "../setup"

// Create mock HTTP responses
const response = createMockResponse({ data: "test" }, 200)

// Create mock HTTP requests
const request = createMockRequest("POST", "http://test.com", { body: "data" })

// Use pre-defined mock data
expect(result.user).toEqual(mockGitHubUser)
```

### Testing Async Code

```typescript
test("should handle async operations", async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})

test("should handle rejected promises", async () => {
  await expect(failingAsyncFunction()).rejects.toThrow("Expected error")
})
```

### Mocking

#### Module Mocking
```typescript
import { mock } from "bun:test"

const mockFunction = mock(() => "mocked return value")

// Use mock.module for external dependencies
mock.module("external-package", () => ({
  externalFunction: mockFunction
}))
```

#### State Management
```typescript
import { beforeEach, afterEach } from "bun:test"
import { state } from "../../src/lib/state"

beforeEach(() => {
  // Reset state before each test
  state.githubToken = undefined
  state.copilotToken = undefined
})
```

### Testing HTTP Routes

```typescript
import { server } from "../../src/server"

test("should handle API request", async () => {
  const request = new Request("http://localhost:4141/v1/models", {
    method: "GET",
    headers: { "Authorization": "Bearer test-token" }
  })

  const response = await server.fetch(request)
  expect(response.status).toBe(200)
  
  const data = await response.json()
  expect(data).toHaveProperty("models")
})
```

## Coverage Reports

### Coverage Thresholds

The project maintains a coverage threshold of 80% as configured in `bunfig.toml`. Tests will fail if coverage drops below this threshold.

### Viewing Coverage

After running tests with coverage:

```bash
# Text output in terminal
bun run test:coverage

# Open HTML report
open coverage/index.html

# View LCOV report
cat coverage/lcov.info
```

### Coverage Reports Include:
- **Text**: Console output with coverage summary
- **HTML**: Interactive web-based coverage report
- **LCOV**: Machine-readable format for CI systems

## CI/CD Integration

### GitHub Actions

The project includes a comprehensive CI/CD pipeline in `.github/workflows/test.yml`:

#### Test Jobs:
1. **Unit & Integration Tests**
   - Install dependencies
   - Run linter
   - Execute test suite
   - Generate coverage reports
   - Upload to Codecov

2. **Docker Testing**
   - Build all Docker images (dev, prod, npx)
   - Test image functionality
   - Verify container startup

#### Workflow Triggers:
- Push to `main` or `develop` branches
- Pull requests to `main` branch

### Environment Variables for CI

Set these in your CI environment:
- `CODECOV_TOKEN`: For coverage reporting (optional)
- `VERBOSE_TESTS`: Set to `true` for detailed test output

## Troubleshooting

### Common Issues

#### 1. Module Resolution Errors
```
Cannot find module 'bun:test'
```
**Solution**: Ensure `bun-types` is installed and `tsconfig.json` includes proper types.

#### 2. Mock Not Working
```
Mock function not being called
```
**Solution**: Check mock setup order and ensure mocks are defined before imports.

#### 3. Tests Timing Out
```
Test exceeded timeout of 30000ms
```
**Solution**: Increase timeout in `bunfig.toml` or optimize slow tests.

#### 4. Coverage Issues
```
Coverage threshold not met
```
**Solution**: Add tests for uncovered code or adjust threshold if appropriate.

### Debugging Tests

#### Enable Verbose Output
```bash
VERBOSE_TESTS=true bun test
```

#### Debug Specific Test
```bash
bun test --grep "failing test name" --verbose
```

#### Check Test Setup
```bash
# Verify test configuration
cat bunfig.toml

# Check test file discovery
bun test --dry-run
```

### Performance Tips

1. **Use `describe.skip()` or `test.skip()`** to temporarily disable slow tests
2. **Mock external dependencies** to avoid network calls
3. **Use `beforeEach/afterEach`** for proper test isolation
4. **Avoid global state mutations** between tests

## Best Practices

### Test Organization
- Group related tests using `describe()` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests focused on a single behavior
- Follow the AAA pattern: Arrange, Act, Assert

### Mocking Strategy
- Mock external dependencies (APIs, file system, etc.)
- Use real implementations for internal modules when possible
- Reset mocks between tests to ensure isolation
- Verify mock calls when testing integration points

### Coverage Strategy
- Aim for high coverage but prioritize quality over quantity
- Focus on testing critical paths and error conditions
- Don't ignore edge cases
- Use coverage reports to identify untested code paths

### Writing Maintainable Tests
- Keep tests simple and readable
- Avoid complex logic in tests
- Use test utilities for common operations
- Document complex test scenarios

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add tests to the appropriate directory (`lib/` for units, `routes/` for integration)
3. Update this documentation if adding new testing patterns
4. Ensure all tests pass and coverage thresholds are met
5. Consider adding both positive and negative test cases

For questions or improvements to the testing framework, please open an issue or pull request.