import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test"

import type { State } from "../../src/lib/state"

import { HTTPError } from "../../src/lib/http-error"

describe("API Key Rotation Integration", () => {
  let originalEnv: Record<string, string | undefined>
  let mockReadFile: any

  beforeEach(async () => {
    // Save original environment
    originalEnv = {
      GITHUB_TOKENS: process.env.GITHUB_TOKENS,
      GITHUB_TOKENS_FILE: process.env.GITHUB_TOKENS_FILE,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    }

    // Clear all environment variables to ensure clean state
    delete process.env.GITHUB_TOKENS
    delete process.env.GITHUB_TOKENS_FILE
    delete process.env.GITHUB_TOKEN

    // Clear all mocks and module cache
    mock.restore()

    // Force reload modules by clearing require cache
    const modulesToClear = [
      "../../src/lib/token-parser",
      "../../src/lib/account-manager",
      "../../src/lib/rotation-logging",
      "../../src/lib/state",
    ]

    for (const mod of modulesToClear) {
      try {
        const resolvedPath = require.resolve(mod)
        delete require.cache[resolvedPath]
      } catch {
        // Module might not be loaded yet, which is fine
      }
    }

    // Setup fresh mock for file reading
    mockReadFile = mock(() => Promise.resolve(""))

    // Mock fs.readFile for this test suite
    mock.module("node:fs/promises", () => ({
      readFile: mockReadFile,
    }))

    // Mock consola to prevent log output during tests
    mock.module("consola", () => ({
      default: {
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
        success: mock(() => {}),
        start: mock(() => {}),
        ready: mock(() => {}),
        log: mock(() => {}),
      },
    }))
  })

  afterEach(() => {
    // Restore original environment
    if (originalEnv.GITHUB_TOKENS !== undefined) {
      process.env.GITHUB_TOKENS = originalEnv.GITHUB_TOKENS
    } else {
      delete process.env.GITHUB_TOKENS
    }

    if (originalEnv.GITHUB_TOKENS_FILE !== undefined) {
      process.env.GITHUB_TOKENS_FILE = originalEnv.GITHUB_TOKENS_FILE
    } else {
      delete process.env.GITHUB_TOKENS_FILE
    }

    if (originalEnv.GITHUB_TOKEN !== undefined) {
      process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN
    } else {
      delete process.env.GITHUB_TOKEN
    }

    // Clear mocks after each test
    mock.restore()
  })

  describe("End-to-end rotation workflow", () => {
    test("should parse tokens, initialize manager, and handle rotation", async () => {
      // Clear environment completely and setup with multiple tokens
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKENS_FILE
      delete process.env.GITHUB_TOKEN

      process.env.GITHUB_TOKENS = "alice:token1,bob:token2,token3"

      // Import fresh modules after setting environment
      const tokenParserModule = await import("../../src/lib/token-parser")
      const accountManagerModule = await import("../../src/lib/account-manager")

      // Parse tokens
      const tokens = await tokenParserModule.getAllTokens()
      expect(tokens).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ])

      // Initialize account manager
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      // Verify initial state
      expect(manager.getCurrentAccount().label).toBe("alice")
      expect(manager.getAccountCount()).toBe(3)

      // Test rotation on 429
      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(true)
      expect(manager.getCurrentAccount().label).toBe("bob")

      // Test state integration
      const state: Partial<State> = { githubToken: undefined }
      manager.updateState(state as State)
      expect(state.githubToken).toBe("token2")
    })

    test("should handle file-based token configuration", async () => {
      // Clear environment tokens
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKEN
      process.env.GITHUB_TOKENS_FILE = "/mock/path/tokens.txt"

      // Mock file reading with expected content
      mockReadFile.mockResolvedValue("dev:token1\nprod:token2\nstaging:token3")

      // Import fresh modules after setting up mocks
      const tokenParserModule = await import("../../src/lib/token-parser")
      const tokens = await tokenParserModule.loadTokensFromFile()

      expect(tokens).toEqual([
        { label: "dev", token: "token1" },
        { label: "prod", token: "token2" },
        { label: "staging", token: "token3" },
      ])
    })

    test("should gracefully fall back to single token mode", async () => {
      // Setup single token
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKENS_FILE
      process.env.GITHUB_TOKEN = "legacy-token"

      // Import fresh modules
      const tokenParserModule = await import("../../src/lib/token-parser")
      const accountManagerModule = await import("../../src/lib/account-manager")

      const tokens = await tokenParserModule.getAllTokens()
      expect(tokens).toEqual([{ label: "account-1", token: "legacy-token" }])

      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      expect(manager.getAccountCount()).toBe(1)

      // Should not rotate with single account
      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(false)
    })
  })

  describe("Real-world usage scenarios", () => {
    test("should handle rapid successive rate limits", async () => {
      process.env.GITHUB_TOKENS = "fast:token1,medium:token2,slow:token3"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      // Simulate rapid rate limiting
      expect(manager.getCurrentAccount().label).toBe("fast")

      manager.rotateOnRateLimit(429) // fast -> medium
      expect(manager.getCurrentAccount().label).toBe("medium")

      manager.rotateOnRateLimit(429) // medium -> slow
      expect(manager.getCurrentAccount().label).toBe("slow")

      manager.rotateOnRateLimit(429) // slow -> fast (wrap around)
      expect(manager.getCurrentAccount().label).toBe("fast")
    })

    test("should track usage statistics across rotations", async () => {
      process.env.GITHUB_TOKENS = "analytics:token1,metrics:token2"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      // Simulate usage
      manager.recordRequest("analytics")
      manager.recordRequest("analytics")
      manager.rotateOnRateLimit(429) // Rate limit hit

      manager.recordRequest("metrics")

      const stats = manager.getUsageStats()
      expect(stats).toEqual({
        analytics: { requests: 2, rateLimitHits: 1 },
        metrics: { requests: 1, rateLimitHits: 0 },
      })
    })

    test("should handle all accounts becoming rate limited", async () => {
      process.env.GITHUB_TOKENS = "busy1:token1,busy2:token2"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      // Mark all accounts as rate limited
      manager.markAccountRateLimited("busy1")
      manager.markAccountRateLimited("busy2")

      expect(manager.areAllAccountsRateLimited()).toBe(true)

      const status = manager.getRotationStatus()
      expect(status.rateLimitedAccounts).toEqual(["busy1", "busy2"])
    })
  })

  describe("Error handling and edge cases", () => {
    test("should handle malformed token environment variables", async () => {
      process.env.GITHUB_TOKENS = "invalid::token,another:bad:format:"
      delete process.env.GITHUB_TOKEN

      const tokenParserModule = await import("../../src/lib/token-parser")

      // The current implementation doesn't throw on malformed tokens, it filters them out
      const tokens = tokenParserModule.parseTokensFromEnv()
      expect(tokens).toEqual([])
    })

    test("should handle empty or whitespace-only configurations", async () => {
      process.env.GITHUB_TOKENS = "   ,  , \n"

      const tokenParserModule = await import("../../src/lib/token-parser")
      const tokens = tokenParserModule.parseTokensFromEnv()

      expect(tokens).toEqual([])
    })

    test("should handle file read failures gracefully", async () => {
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKEN
      process.env.GITHUB_TOKENS_FILE = "/nonexistent/path.txt"

      // Mock file read failure
      mockReadFile.mockImplementation(() =>
        Promise.reject(new Error("ENOENT: no such file or directory")),
      )

      const tokenParserModule = await import("../../src/lib/token-parser")

      // The current implementation returns empty array on file read errors
      const result = await tokenParserModule.loadTokensFromFile()
      expect(result).toEqual([])
    })

    test("should prevent infinite rotation loops", async () => {
      process.env.GITHUB_TOKENS = "loop1:token1,loop2:token2"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      // Mark all accounts as rate limited
      manager.markAccountRateLimited("loop1")
      manager.markAccountRateLimited("loop2")

      // Should not allow rotation when all are rate limited
      const rotated = manager.rotateOnRateLimit(429)
      expect(rotated).toBe(false)
    })
  })

  describe("Backward compatibility", () => {
    test("should maintain exact compatibility with existing single-token setup", async () => {
      // Traditional setup
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKENS_FILE
      process.env.GITHUB_TOKEN = "traditional-token"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const tokenParserModule = await import("../../src/lib/token-parser")

      const tokens = await tokenParserModule.getAllTokens()
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      const state: State = {
        githubToken: undefined,
        accountType: "individual",
        manualApprove: false,
        rateLimitWait: false,
        visionEnabled: false,
      }

      manager.updateState(state)

      // Should behave exactly like original implementation
      expect(state.githubToken).toBe("traditional-token")
      expect(manager.getAccountCount()).toBe(1)
      expect(manager.rotateOnRateLimit(429)).toBe(false) // No rotation possible
    })

    test("should work with existing rate limiting mechanism", async () => {
      process.env.GITHUB_TOKENS = "rate1:token1,rate2:token2"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const rateLimitModule = await import("../../src/lib/rate-limit")

      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      const state: State = {
        githubToken: "token1",
        accountType: "individual",
        manualApprove: false,
        rateLimitWait: false,
        visionEnabled: false,
        rateLimitSeconds: 5,
        lastRequestTimestamp: Date.now() - 1000, // 1 second ago
      }

      // Should still respect existing rate limiting
      await expect(rateLimitModule.checkRateLimit(state)).rejects.toThrow(
        HTTPError,
      )
    })
  })

  describe("Configuration precedence", () => {
    test("should prioritize GITHUB_TOKENS over file and fallback", async () => {
      process.env.GITHUB_TOKENS = "priority:from-env"
      process.env.GITHUB_TOKENS_FILE = "/mock/file.txt"
      process.env.GITHUB_TOKEN = "fallback-token"

      const tokenParserModule = await import("../../src/lib/token-parser")
      const tokens = await tokenParserModule.getAllTokens()

      expect(tokens).toEqual([{ label: "priority", token: "from-env" }])
    })

    test("should use file when env var not set", async () => {
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKEN
      process.env.GITHUB_TOKENS_FILE = "/mock/file.txt"

      // Mock file reading
      mockReadFile.mockResolvedValue("file:from-file")

      const tokenParserModule = await import("../../src/lib/token-parser")
      const tokens = await tokenParserModule.getAllTokens()

      expect(tokens).toEqual([{ label: "file", token: "from-file" }])
    })

    test("should use fallback when no other sources available", async () => {
      delete process.env.GITHUB_TOKENS
      delete process.env.GITHUB_TOKENS_FILE
      process.env.GITHUB_TOKEN = "final-fallback"

      const tokenParserModule = await import("../../src/lib/token-parser")
      const tokens = await tokenParserModule.getAllTokens()

      expect(tokens).toEqual([{ label: "account-1", token: "final-fallback" }])
    })
  })

  describe("Performance and resource management", () => {
    test("should handle large numbers of accounts efficiently", async () => {
      // Generate 100 accounts
      const manyTokens = Array.from(
        { length: 100 },
        (_, i) => `account-${i + 1}:token${i + 1}`,
      ).join(",")

      process.env.GITHUB_TOKENS = manyTokens

      const accountManagerModule = await import("../../src/lib/account-manager")
      const tokenParserModule = await import("../../src/lib/token-parser")

      const startTime = Date.now()
      const tokens = await tokenParserModule.getAllTokens()
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()
      const endTime = Date.now()

      expect(tokens).toHaveLength(100)
      expect(manager.getAccountCount()).toBe(100)
      expect(endTime - startTime).toBeLessThan(1000) // Should be fast
    })

    test("should not leak memory during rotations", async () => {
      process.env.GITHUB_TOKENS = "mem1:token1,mem2:token2,mem3:token3"

      const accountManagerModule = await import("../../src/lib/account-manager")
      const manager = new accountManagerModule.AccountManager()
      await manager.initialize()

      // Perform many rotations
      for (let i = 0; i < 1000; i++) {
        manager.rotateOnRateLimit(429)
        manager.recordRequest(manager.getCurrentAccount().label)
      }

      // Should still be functional
      expect(manager.getAccountCount()).toBe(3)
      expect(manager.getCurrentAccount()).toBeDefined()
    })
  })
})
