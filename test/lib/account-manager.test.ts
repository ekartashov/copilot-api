import { test, expect, describe, beforeEach, afterAll, mock } from "bun:test"

import type { State } from "../../src/lib/state"

// Mock consola
const mockConsola = {
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
}
mock.module("consola", () => ({
  default: mockConsola,
}))

// Mock token parser functions for isolated testing
const mockParseTokensFromEnv = mock<() => Array<TokenAccount>>(() => [])
const mockLoadTokensFromFile = mock<() => Promise<Array<TokenAccount>>>(() =>
  Promise.resolve([]),
)
const mockGetAllTokens = mock<() => Promise<Array<TokenAccount>>>(() =>
  Promise.resolve([]),
)

// Create an isolated mock that only affects this test file
const mockTokenParser = {
  parseTokensFromEnv: mockParseTokensFromEnv,
  loadTokensFromFile: mockLoadTokensFromFile,
  getAllTokens: mockGetAllTokens,
}

// Only mock during this specific test file execution
mock.module("../../src/lib/token-parser", () => mockTokenParser)

interface TokenAccount {
  label: string
  token: string
}

describe("Account Manager", () => {
  beforeEach(() => {
    // Clear mock call history
    mockConsola.info.mockClear()
    mockConsola.warn.mockClear()
    mockConsola.error.mockClear()
    mockParseTokensFromEnv.mockClear()
    mockLoadTokensFromFile.mockClear()
    mockGetAllTokens.mockClear()

    // Reset mock implementations to defaults
    mockParseTokensFromEnv.mockReturnValue([])
    mockLoadTokensFromFile.mockResolvedValue([])
    mockGetAllTokens.mockResolvedValue([])
  })

  describe("AccountManager class", () => {
    test("should initialize with token accounts", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(manager.getAccountCount()).toBe(2)
      expect(manager.getCurrentAccount()).toEqual({
        label: "alice",
        token: "token1",
      })
    })

    test("should initialize with single token when no multiple tokens available", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "account-1", token: "single-token" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(manager.getAccountCount()).toBe(1)
      expect(manager.getCurrentAccount()).toEqual({
        label: "account-1",
        token: "single-token",
      })
    })

    test("should throw error when no tokens are available", async () => {
      mockGetAllTokens.mockResolvedValue([])

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()

      await expect(manager.initialize()).rejects.toThrow(
        "No GitHub tokens available",
      )
    })

    test("should log initialization with account labels", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Initialized account rotation with 3 accounts: alice, bob, account-3",
      )
    })
  })

  describe("Account rotation", () => {
    test("should rotate to next account on 429 rate limit", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "charlie", token: "token3" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(manager.getCurrentAccount().label).toBe("alice")

      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(true)
      expect(manager.getCurrentAccount().label).toBe("bob")

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rate limit hit for account 'alice', rotating to account 'bob'",
      )
    })

    test("should not rotate on non-429 status codes", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      // Clear mock after initialization to test only rotation calls
      mockConsola.info.mockClear()

      expect(manager.getCurrentAccount().label).toBe("alice")

      const rotated401 = manager.rotateOnRateLimit(401)
      expect(rotated401).toBe(false)
      expect(manager.getCurrentAccount().label).toBe("alice")

      const rotated403 = manager.rotateOnRateLimit(403)
      expect(rotated403).toBe(false)
      expect(manager.getCurrentAccount().label).toBe("alice")

      const rotated500 = manager.rotateOnRateLimit(500)
      expect(rotated500).toBe(false)
      expect(manager.getCurrentAccount().label).toBe("alice")

      expect(mockConsola.info).not.toHaveBeenCalled()
    })

    test("should wrap around to first account after last account", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      // Start with alice
      expect(manager.getCurrentAccount().label).toBe("alice")

      // Rotate to bob
      manager.rotateOnRateLimit(429)
      expect(manager.getCurrentAccount().label).toBe("bob")

      // Rotate back to alice (wrap around)
      manager.rotateOnRateLimit(429)
      expect(manager.getCurrentAccount().label).toBe("alice")

      expect(mockConsola.info).toHaveBeenCalledWith(
        "Rate limit hit for account 'bob', rotating to account 'alice'",
      )
    })

    test("should handle single account gracefully", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "only-account", token: "only-token" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(manager.getCurrentAccount().label).toBe("only-account")

      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(false)
      expect(manager.getCurrentAccount().label).toBe("only-account")

      expect(mockConsola.warn).toHaveBeenCalledWith(
        "Rate limit hit for account 'only-account', but no other accounts available",
      )
    })
  })

  describe("All accounts rate limited detection", () => {
    test("should detect when all accounts are rate limited", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "charlie", token: "token3" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      // Mark all accounts as rate limited
      manager.rotateOnRateLimit(429) // alice -> bob
      manager.markAccountRateLimited("alice")

      manager.rotateOnRateLimit(429) // bob -> charlie
      manager.markAccountRateLimited("bob")

      manager.rotateOnRateLimit(429) // charlie -> alice (but alice is rate limited)
      manager.markAccountRateLimited("charlie")

      expect(manager.areAllAccountsRateLimited()).toBe(true)

      expect(mockConsola.error).toHaveBeenCalledWith(
        "All accounts are rate limited. Consider reducing request frequency or adding more tokens.",
      )
    })

    test("should not detect all rate limited when some accounts are available", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "charlie", token: "token3" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      manager.markAccountRateLimited("alice")
      manager.markAccountRateLimited("bob")
      // charlie is still available

      expect(manager.areAllAccountsRateLimited()).toBe(false)
    })

    test("should reset rate limit status after cooldown period", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      // Mark alice as rate limited
      manager.markAccountRateLimited("alice")
      expect(manager.isAccountRateLimited("alice")).toBe(true)

      // Reset after cooldown (this would typically be time-based)
      manager.resetRateLimitStatus("alice")
      expect(manager.isAccountRateLimited("alice")).toBe(false)
    })
  })

  describe("State integration", () => {
    test("should update state with current account token", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const state: Partial<State> = {
        githubToken: undefined,
        accountType: "individual",
        manualApprove: false,
        rateLimitWait: false,
        visionEnabled: false,
      }

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      manager.updateState(state as State)
      expect(state.githubToken).toBe("token1")

      manager.rotateOnRateLimit(429)
      manager.updateState(state as State)
      expect(state.githubToken).toBe("token2")
    })

    test("should preserve other state properties", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const state: State = {
        githubToken: "old-token",
        copilotToken: "copilot-token",
        accountType: "business",
        manualApprove: true,
        rateLimitWait: true,
        visionEnabled: true,
        rateLimitSeconds: 60,
        lastRequestTimestamp: 12345,
        models: undefined,
        vsCodeVersion: "1.85.0",
      }

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      manager.updateState(state)

      expect(state.githubToken).toBe("token1")
      expect(state.copilotToken).toBe("copilot-token")
      expect(state.accountType).toBe("business")
      expect(state.manualApprove).toBe(true)
      expect(state.rateLimitWait).toBe(true)
      expect(state.visionEnabled).toBe(true)
      expect(state.rateLimitSeconds).toBe(60)
      expect(state.lastRequestTimestamp).toBe(12345)
      expect(state.vsCodeVersion).toBe("1.85.0")
    })
  })

  describe("Account statistics and reporting", () => {
    test("should provide account usage statistics", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "charlie", token: "token3" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      // Simulate some usage
      manager.recordRequest("alice")
      manager.recordRequest("alice")
      manager.rotateOnRateLimit(429) // alice -> bob
      manager.recordRequest("bob")

      const stats = manager.getUsageStats()
      expect(stats).toEqual({
        alice: { requests: 2, rateLimitHits: 1 },
        bob: { requests: 1, rateLimitHits: 0 },
        charlie: { requests: 0, rateLimitHits: 0 },
      })
    })

    test("should provide current rotation status", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      const initialStatus = manager.getRotationStatus()
      expect(initialStatus).toEqual({
        currentAccount: "alice",
        totalAccounts: 2,
        currentIndex: 0,
        rateLimitedAccounts: [],
      })

      manager.rotateOnRateLimit(429)
      manager.markAccountRateLimited("alice")

      const afterRotationStatus = manager.getRotationStatus()
      expect(afterRotationStatus).toEqual({
        currentAccount: "bob",
        totalAccounts: 2,
        currentIndex: 1,
        rateLimitedAccounts: ["alice"],
      })
    })
  })

  describe("Error handling", () => {
    test("should handle invalid account labels gracefully", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(() => manager.markAccountRateLimited("nonexistent")).not.toThrow()
      expect(() => manager.resetRateLimitStatus("nonexistent")).not.toThrow()
      expect(manager.isAccountRateLimited("nonexistent")).toBe(false)
    })

    test("should handle token validation errors during initialization", async () => {
      mockGetAllTokens.mockRejectedValue(new Error("Token validation failed"))

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()

      await expect(manager.initialize()).rejects.toThrow(
        "Failed to initialize account manager: Token validation failed",
      )
    })

    test("should provide fallback behavior when rotation fails", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "alice", token: "token1" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      // Attempt rotation with single account
      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(false)
      expect(manager.getCurrentAccount().label).toBe("alice")

      // Should still be functional
      expect(() => manager.updateState({} as State)).not.toThrow()
    })
  })

  describe("Backward compatibility", () => {
    test("should work with legacy single GITHUB_TOKEN setup", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "account-1", token: "legacy-token" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      expect(manager.getAccountCount()).toBe(1)
      expect(manager.getCurrentAccount()).toEqual({
        label: "account-1",
        token: "legacy-token",
      })

      // Should handle rate limit gracefully without rotation
      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(false)
    })

    test("should maintain consistent behavior when no rotation is possible", async () => {
      const accounts: Array<TokenAccount> = [
        { label: "single", token: "single-token" },
      ]
      mockGetAllTokens.mockResolvedValue(accounts)

      const { AccountManager } = require("../../src/lib/account-manager")
      const manager = new AccountManager()
      await manager.initialize()

      const state: Partial<State> = { githubToken: undefined }

      // Should always use the same token
      manager.updateState(state as State)
      expect(state.githubToken).toBe("single-token")

      manager.rotateOnRateLimit(429)
      manager.updateState(state as State)
      expect(state.githubToken).toBe("single-token")
    })
  })

  afterAll(() => {
    // Restore original modules after all tests complete
    mock.restore()
  })
})
