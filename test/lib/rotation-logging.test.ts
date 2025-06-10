import { test, expect, describe, beforeEach, mock } from "bun:test"

// Mock consola with all methods needed for logging
const mockConsola = {
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
  success: mock(() => {}),
  debug: mock(() => {}),
  box: mock(() => {}),
  level: 3,
}
mock.module("consola", () => ({
  default: mockConsola,
}))

interface TokenAccount {
  label: string
  token: string
}

describe("Rotation Logging Integration", () => {
  beforeEach(() => {
    mockConsola.info.mockClear()
    mockConsola.warn.mockClear()
    mockConsola.error.mockClear()
    mockConsola.success.mockClear()
    mockConsola.debug.mockClear()
    mockConsola.box.mockClear()
  })

  describe("Account rotation logging", () => {
    test("should log account rotation with proper labels", () => {
      const { logAccountRotation } = require("../../src/lib/rotation-logging")

      logAccountRotation("alice", "bob", 429)

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rate limit hit for account 'alice', rotating to account 'bob'",
      )
    })

    test("should log different rotation scenarios with context", () => {
      const { logAccountRotation } = require("../../src/lib/rotation-logging")

      // Test with auto-generated labels
      logAccountRotation("account-1", "account-2", 429)
      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rate limit hit for account 'account-1', rotating to account 'account-2'",
      )

      // Test with mixed label types
      logAccountRotation("dev-alice", "account-3", 429)
      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rate limit hit for account 'dev-alice', rotating to account 'account-3'",
      )
    })

    test("should include rate limit details in rotation logs", () => {
      const {
        logAccountRotationWithDetails,
      } = require("../../src/lib/rotation-logging")

      logAccountRotationWithDetails("alice", "bob", {
        statusCode: 429,
        retryAfter: 3600,
        remainingRequests: 0,
        resetTime: new Date("2025-01-01T12:00:00Z"),
      })

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rate limit hit for account 'alice' (0 requests remaining, resets at 2025-01-01T12:00:00.000Z), rotating to account 'bob'",
      )
    })
  })

  describe("Rate limit status logging", () => {
    test("should log when account becomes rate limited", () => {
      const {
        logAccountRateLimited,
      } = require("../../src/lib/rotation-logging")

      logAccountRateLimited("alice", {
        resetTime: new Date("2025-01-01T13:00:00Z"),
      })

      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Account 'alice' is now rate limited (resets at 13:00:00)",
      )
    })

    test("should log when account rate limit is reset", () => {
      const {
        logAccountRateLimitReset,
      } = require("../../src/lib/rotation-logging")

      logAccountRateLimitReset("alice")

      expect(mockConsola.success).toHaveBeenCalledWith(
        "Account 'alice' rate limit has been reset and is now available",
      )
    })

    test("should log when all accounts are rate limited", () => {
      const {
        logAllAccountsRateLimited,
      } = require("../../src/lib/rotation-logging")

      const accounts = ["alice", "bob", "charlie"]
      logAllAccountsRateLimited(accounts)

      expect(mockConsola.error).toHaveBeenCalledWith(
        "All accounts are rate limited: alice, bob, charlie. Consider reducing request frequency or adding more tokens.",
      )
    })

    test("should log single account rate limited scenario", () => {
      const {
        logSingleAccountRateLimited,
      } = require("../../src/lib/rotation-logging")

      logSingleAccountRateLimited("only-account")

      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Rate limit hit for account 'only-account', but no other accounts available",
      )
    })
  })

  describe("Account initialization logging", () => {
    test("should log successful multi-account initialization", () => {
      const {
        logAccountInitialization,
      } = require("../../src/lib/rotation-logging")

      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ]

      logAccountInitialization(accounts)

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Initialized account rotation with 3 accounts: alice, bob, account-3",
      )
    })

    test("should log single account initialization", () => {
      const {
        logAccountInitialization,
      } = require("../../src/lib/rotation-logging")

      const accounts: Array<TokenAccount> = [
        { label: "single-account", token: "token1" },
      ]

      logAccountInitialization(accounts)

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Initialized with single account: single-account",
      )
    })

    test("should log backward compatibility mode", () => {
      const { logLegacyTokenMode } = require("../../src/lib/rotation-logging")

      logLegacyTokenMode()

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Using legacy single token mode (backward compatibility)",
      )
    })
  })

  describe("Request tracking logging", () => {
    test("should log request with account label", () => {
      const { logAccountRequest } = require("../../src/lib/rotation-logging")

      logAccountRequest("alice", "GET", "/copilot_internal/v2/token")

      expect(mockConsola.debug).toHaveBeenCalledWith(
        "Request using account 'alice': GET /copilot_internal/v2/token",
      )
    })

    test("should log successful request with timing", () => {
      const { logRequestSuccess } = require("../../src/lib/rotation-logging")

      logRequestSuccess({
        account: "bob",
        method: "POST",
        path: "/chat/completions",
        status: 200,
        duration: 150,
      })

      expect(mockConsola.debug).toHaveBeenCalledWith(
        "Request completed using account 'bob': POST /chat/completions -> 200 (150ms)",
      )
    })

    test("should log failed request with account context", () => {
      const { logRequestFailure } = require("../../src/lib/rotation-logging")

      logRequestFailure({
        account: "charlie",
        method: "GET",
        path: "/models",
        status: 403,
        error: "Insufficient permissions",
      })

      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Request failed using account 'charlie': GET /models -> 403 (Insufficient permissions)",
      )
    })
  })

  describe("Usage statistics logging", () => {
    test("should log account usage summary", () => {
      const { logUsageStats } = require("../../src/lib/rotation-logging")

      const stats = {
        alice: { requests: 50, rateLimitHits: 2, successRate: 0.96 },
        bob: { requests: 30, rateLimitHits: 1, successRate: 0.97 },
        charlie: { requests: 20, rateLimitHits: 0, successRate: 1.0 },
      }

      logUsageStats(stats)

      expect(mockConsola.info).toHaveBeenCalledWith("Account usage statistics:")
      expect(mockConsola.info).toHaveBeenCalledWith(
        "  alice: 50 requests, 2 rate limit hits (96% success)",
      )
      expect(mockConsola.info).toHaveBeenCalledWith(
        "  bob: 30 requests, 1 rate limit hits (97% success)",
      )
      expect(mockConsola.info).toHaveBeenCalledWith(
        "  charlie: 20 requests, 0 rate limit hits (100% success)",
      )
    })

    test("should log rotation status summary", () => {
      const { logRotationStatus } = require("../../src/lib/rotation-logging")

      const status = {
        currentAccount: "bob",
        totalAccounts: 3,
        currentIndex: 1,
        rateLimitedAccounts: ["alice"],
      }

      logRotationStatus(status)

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rotation status: Currently using 'bob' (2/3), Rate limited: alice",
      )
    })

    test("should log clean rotation status when no accounts are rate limited", () => {
      const { logRotationStatus } = require("../../src/lib/rotation-logging")

      const status = {
        currentAccount: "alice",
        totalAccounts: 2,
        currentIndex: 0,
        rateLimitedAccounts: [],
      }

      logRotationStatus(status)

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rotation status: Currently using 'alice' (1/2), Rate limited: none",
      )
    })
  })

  describe("Error and warning logging", () => {
    test("should log token parsing errors with context", () => {
      const { logTokenParsingError } = require("../../src/lib/rotation-logging")

      logTokenParsingError(
        "GITHUB_TOKENS",
        "Invalid format: missing colon separator",
      )

      expect(mockConsola.error).toHaveBeenCalledWith(
        "Failed to parse tokens from GITHUB_TOKENS: Invalid format: missing colon separator",
      )
    })

    test("should log file reading errors", () => {
      const { logFileReadError } = require("../../src/lib/rotation-logging")

      logFileReadError(
        "/path/to/tokens.txt",
        "ENOENT: no such file or directory",
      )

      expect(mockConsola.error).toHaveBeenCalledWith(
        "Failed to read tokens file '/path/to/tokens.txt': ENOENT: no such file or directory",
      )
    })

    test("should log token validation warnings", () => {
      const {
        logTokenValidationWarning,
      } = require("../../src/lib/rotation-logging")

      logTokenValidationWarning("alice", "Token format appears invalid")

      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Token validation warning for account 'alice': Token format appears invalid",
      )
    })

    test("should log initialization failures", () => {
      const {
        logInitializationError,
      } = require("../../src/lib/rotation-logging")

      logInitializationError("No valid tokens found")

      expect(mockConsola.error).toHaveBeenCalledWith(
        "Account manager initialization failed: No valid tokens found",
      )
    })
  })

  describe("Verbose logging mode", () => {
    test("should provide detailed logging when verbose mode is enabled", () => {
      mockConsola.level = 5 // Verbose level

      const {
        logVerboseAccountRotation,
      } = require("../../src/lib/rotation-logging")

      logVerboseAccountRotation("alice", "bob", {
        previousRequests: 25,
        rateLimitWindow: "1 hour",
        nextResetTime: "2025-01-01T14:00:00Z",
        availableAccounts: ["bob", "charlie"],
      })

      expect(mockConsola.debug).toHaveBeenCalledWith(
        "Verbose rotation details: alice -> bob",
      )
      expect(mockConsola.debug).toHaveBeenCalledWith(
        "  Previous requests: 25, Window: 1 hour, Next reset: 2025-01-01T14:00:00Z",
      )
      expect(mockConsola.debug).toHaveBeenCalledWith(
        "  Available accounts after rotation: bob, charlie",
      )
    })

    test("should skip verbose logging when not in verbose mode", () => {
      mockConsola.level = 3 // Normal level

      const {
        logVerboseAccountRotation,
      } = require("../../src/lib/rotation-logging")

      logVerboseAccountRotation("alice", "bob", {
        previousRequests: 25,
        rateLimitWindow: "1 hour",
        nextResetTime: "2025-01-01T14:00:00Z",
        availableAccounts: ["bob", "charlie"],
      })

      expect(mockConsola.debug).not.toHaveBeenCalled()
    })
  })

  describe("Integration with existing logging style", () => {
    test("should maintain consistency with existing consola usage patterns", () => {
      const {
        logServerStartWithRotation,
      } = require("../../src/lib/rotation-logging")

      logServerStartWithRotation("http://localhost:4141", 3)

      // Should use box like existing server startup
      expect(mockConsola.box).toHaveBeenCalledWith(
        `Server started at http://localhost:4141\nAccount rotation: 3 accounts configured`,
      )
    })

    test("should follow existing log level conventions", () => {
      const { logAccountAction } = require("../../src/lib/rotation-logging")

      // Info for normal operations
      logAccountAction("info", "alice", "Switched to account")
      expect(mockConsola.info).toHaveBeenCalledWith(
        "Switched to account 'alice'",
      )

      // Warn for concerning situations
      logAccountAction("warn", "bob", "Account approaching rate limit")
      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Account approaching rate limit 'bob'",
      )

      // Error for failures
      logAccountAction("error", "charlie", "Account authentication failed")
      expect(mockConsola.error).toHaveBeenCalledWith(
        "Account authentication failed 'charlie'",
      )
    })

    test("should integrate with existing rate limit logging", () => {
      const {
        logRateLimitWithRotation,
      } = require("../../src/lib/rotation-logging")

      logRateLimitWithRotation("alice", 30, true)

      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Rate limit reached for account 'alice'. Waiting 30 seconds before proceeding...",
      )
    })
  })

  describe("Log message formatting", () => {
    test("should format account labels consistently", () => {
      const { formatAccountLabel } = require("../../src/lib/rotation-logging")

      expect(formatAccountLabel("alice")).toBe("'alice'")
      expect(formatAccountLabel("account-1")).toBe("'account-1'")
      expect(formatAccountLabel("dev-team-bot")).toBe("'dev-team-bot'")
    })

    test("should format time stamps consistently", () => {
      const { formatResetTime } = require("../../src/lib/rotation-logging")

      const resetTime = new Date("2025-01-01T15:30:45Z")
      expect(formatResetTime(resetTime)).toBe("15:30:45")
    })

    test("should format account lists for logging", () => {
      const { formatAccountList } = require("../../src/lib/rotation-logging")

      expect(formatAccountList(["alice", "bob", "charlie"])).toBe(
        "alice, bob, charlie",
      )
      expect(formatAccountList(["single"])).toBe("single")
      expect(formatAccountList([])).toBe("none")
    })

    test("should format request statistics", () => {
      const { formatRequestStats } = require("../../src/lib/rotation-logging")

      const result = formatRequestStats(45, 2, 0.96)
      expect(result).toBe("45 requests, 2 rate limit hits (96% success)")
    })
  })
})
