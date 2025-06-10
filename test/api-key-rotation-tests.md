# API Key Rotation Tests Documentation

This document describes the comprehensive test suite for the API Key Rotation feature, implemented using Test Driven Development (TDD).

## Overview

The API Key Rotation feature enables automatic switching between multiple GitHub tokens when rate limits are encountered, providing better reliability and throughput for the Copilot API proxy.

## Test Structure

### Core Test Files

#### 1. `test/lib/token-parser.test.ts` - Token Parsing Logic Tests

**Purpose**: Tests the parsing and validation of GitHub tokens from various sources.

**Key Test Cases**:
- Parse `GITHUB_TOKENS` environment variable: `"alice:token1,bob:token2,token3"`
- Parse `GITHUB_TOKENS_FILE` (newline-delimited): `"alice:token1\nbob:token2\ntoken3"`
- Auto-generate labels for unlabeled tokens (`account-1`, `account-2`, etc.)
- Handle mixed labeled and unlabeled tokens
- Validate token formats and handle errors
- Source priority: `GITHUB_TOKENS` > `GITHUB_TOKENS_FILE` > `GITHUB_TOKEN`

**Expected Parsing Results**:
```typescript
// Input: "alice:token1,bob:token2,token3"
// Output: 
[
  { label: "alice", token: "token1" },
  { label: "bob", token: "token2" },
  { label: "account-3", token: "token3" }
]
```

#### 2. `test/lib/account-manager.test.ts` - Core Rotation Logic Tests

**Purpose**: Tests the account management and rotation behavior.

**Key Test Cases**:
- Initialize with multiple token accounts
- Rotate to next account only on 429 rate limit responses
- Handle single account gracefully (no rotation)
- Wrap around to first account after last account
- Track rate-limited accounts and detect when all are limited
- Update application state with current account token
- Maintain usage statistics and rotation status
- Backward compatibility with single `GITHUB_TOKEN`

**Rotation Behavior**:
```typescript
// Should rotate ONLY on 429 status codes
manager.rotateOnRateLimit(429) // ✅ Rotates
manager.rotateOnRateLimit(401) // ❌ Does not rotate
manager.rotateOnRateLimit(403) // ❌ Does not rotate
manager.rotateOnRateLimit(500) // ❌ Does not rotate
```

#### 3. `test/lib/rotation-logging.test.ts` - Logging Integration Tests

**Purpose**: Tests the integration with `consola` logging system and proper account labeling in log messages.

**Key Test Cases**:
- Log account rotation with proper labels
- Log rate limit status changes
- Log account initialization
- Log request tracking with account context
- Log usage statistics and rotation status
- Maintain consistency with existing logging patterns
- Support verbose logging mode
- Format account labels and timestamps consistently

**Logging Examples**:
```typescript
// Account rotation
consola.info("Rate limit hit for account 'alice', rotating to account 'bob'")

// Initialization
consola.info("Initialized account rotation with 3 accounts: alice, bob, account-3")

// All accounts rate limited
consola.error("All accounts are rate limited: alice, bob, charlie. Consider reducing request frequency or adding more tokens.")
```

### Integration Tests

#### 4. `test/integration/api-key-rotation.test.ts` - End-to-End Integration Tests

**Purpose**: Tests complete workflows and real-world usage scenarios.

**Key Test Cases**:
- End-to-end parsing → initialization → rotation workflow
- File-based token configuration
- Rapid successive rate limits
- All accounts becoming rate limited
- Error handling and edge cases
- Backward compatibility with existing setup
- Configuration precedence testing
- Performance with large numbers of accounts

## Feature Requirements Tested

### ✅ Core Requirements Coverage

1. **Token Parsing**:
   - ✅ Parse `GITHUB_TOKENS`: `"alice:token1,bob:token2,token3"`
   - ✅ Parse `GITHUB_TOKENS_FILE`: `"alice:token1\nbob:token2\ntoken3"`
   - ✅ Auto-generate labels: `account-1`, `account-2`, etc.

2. **Rotation Logic**:
   - ✅ Rotate only on 429 rate limit responses
   - ✅ Maintain round-robin rotation order
   - ✅ Handle single account gracefully

3. **Logging Integration**:
   - ✅ Use existing `consola` logging style
   - ✅ Include account labels in all messages
   - ✅ Log rotation events and status changes

4. **Backward Compatibility**:
   - ✅ Work with existing single `GITHUB_TOKEN`
   - ✅ Preserve existing state management
   - ✅ Integrate with existing rate limiting

### 🔧 Error Handling Tested

- Invalid token formats
- File read errors
- Empty configurations
- All accounts rate limited
- Network failures
- Configuration validation

### 📊 Edge Cases Covered

- Single account setup
- Empty token lists
- Malformed input
- Large numbers of accounts
- Memory management during rotations
- Configuration precedence

## Test Execution Strategy

### Running Tests

```bash
# Run all rotation tests
bun test test/lib/token-parser.test.ts
bun test test/lib/account-manager.test.ts
bun test test/lib/rotation-logging.test.ts
bun test test/integration/api-key-rotation.test.ts

# Run with coverage
bun test --coverage

# Watch mode during development
bun test --watch
```

### Test Dependencies

The tests use mocking for:
- `consola` logging system
- File system operations
- Environment variables
- Token validation

## Implementation Guidance

### Files to Implement (Based on Tests)

1. **`src/lib/token-parser.ts`**:
   - `parseTokensFromEnv()` - Parse comma-separated tokens
   - `parseTokensFromFile()` - Parse newline-delimited file
   - `loadTokensFromFile()` - Read tokens from file system
   - `getAllTokens()` - Unified token retrieval
   - `validateToken()` - Token format validation

2. **`src/lib/account-manager.ts`**:
   - `AccountManager` class with rotation logic
   - `initialize()` - Setup with parsed tokens
   - `rotateOnRateLimit(statusCode)` - Conditional rotation
   - `getCurrentAccount()` - Get active account
   - `updateState(state)` - Sync with application state
   - Rate limiting tracking and statistics

3. **`src/lib/rotation-logging.ts`**:
   - Logging functions for all rotation events
   - Account label formatting
   - Integration with existing `consola` patterns
   - Verbose logging support

### State Integration

The `State` interface should be extended to support rotation:

```typescript
interface State {
  // Existing fields...
  githubToken?: string
  
  // New rotation fields (optional for backward compatibility)
  accountManager?: AccountManager
  currentAccountLabel?: string
}
```

### Configuration Priority

1. `GITHUB_TOKENS` environment variable (highest priority)
2. `GITHUB_TOKENS_FILE` file path
3. `GITHUB_TOKEN` single token (backward compatibility)

## Success Criteria

✅ All tests pass (proving the feature works as designed)
✅ Backward compatibility maintained
✅ Proper error handling and logging
✅ Performance acceptable with multiple accounts
✅ Memory usage stable during rotations
✅ Integration with existing codebase patterns

## Next Steps

1. Implement the actual feature code to make these tests pass
2. Integration testing with real GitHub API endpoints
3. Performance testing with production-like token counts
4. Documentation updates for users
5. CLI argument updates for new configuration options

The tests define the exact behavior expected from the implementation, ensuring that when the feature code is written to pass these tests, it will provide the complete API Key Rotation functionality as specified.