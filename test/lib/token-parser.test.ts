import { test, expect, describe, beforeEach, afterEach } from "bun:test"

describe("Token Parser", () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    // Save original environment
    originalEnv = {
      GH_TOKENS: process.env.GH_TOKENS,
      GH_TOKENS_FILE: process.env.GH_TOKENS_FILE,
      GH_TOKEN: process.env.GH_TOKEN,
    }
  })

  afterEach(() => {
    // Restore original environment
    process.env.GH_TOKENS = originalEnv.GH_TOKENS
    process.env.GH_TOKENS_FILE = originalEnv.GH_TOKENS_FILE
    process.env.GH_TOKEN = originalEnv.GH_TOKEN
  })

  describe("parseTokensFromEnv", () => {
    test("should parse comma-separated tokens with labels", () => {
      process.env.GH_TOKENS = "alice:token1,bob:token2,charlie:token3"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "charlie", token: "token3" },
      ])
    })

    test("should parse mixed labeled and unlabeled tokens", () => {
      process.env.GH_TOKENS = "alice:token1,token2,bob:token3,token4"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "account-2", token: "token2" },
        { label: "bob", token: "token3" },
        { label: "account-4", token: "token4" },
      ])
    })

    test("should parse all unlabeled tokens with auto-generated labels", () => {
      process.env.GH_TOKENS = "token1,token2,token3"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([
        { label: "account-1", token: "token1" },
        { label: "account-2", token: "token2" },
        { label: "account-3", token: "token3" },
      ])
    })

    test("should handle single token with label", () => {
      process.env.GH_TOKENS = "alice:token1"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([{ label: "alice", token: "token1" }])
    })

    test("should handle single token without label", () => {
      process.env.GH_TOKENS = "token1"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([{ label: "account-1", token: "token1" }])
    })

    test("should handle empty GH_TOKENS", () => {
      process.env.GH_TOKENS = ""

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([])
    })

    test("should handle tokens with whitespace", () => {
      process.env.GH_TOKENS = " alice:token1 , bob:token2 , token3 "

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ])
    })

    test("should handle tokens with special characters in labels", () => {
      process.env.GH_TOKENS = "dev-alice:token1,prod_bob:token2"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([
        { label: "dev-alice", token: "token1" },
        { label: "prod_bob", token: "token2" },
      ])
    })

    test("should return empty array when GH_TOKENS is not set", () => {
      delete process.env.GH_TOKENS
      process.env.GH_TOKEN = "fallback-token"

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([])
    })

    test("should return empty array when no tokens are available", () => {
      delete process.env.GH_TOKENS
      delete process.env.GH_TOKEN

      const { parseTokensFromEnv } = require("../../src/lib/token-parser")
      const result = parseTokensFromEnv()

      expect(result).toEqual([])
    })
  })

  describe("parseTokensFromFile", () => {
    test("should parse newline-delimited tokens with labels", async () => {
      const fileContent = "alice:token1\nbob:token2\ncharlie:token3"

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "charlie", token: "token3" },
      ])
    })

    test("should parse mixed labeled and unlabeled tokens from file", async () => {
      const fileContent = "alice:token1\ntoken2\nbob:token3\ntoken4"

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "account-2", token: "token2" },
        { label: "bob", token: "token3" },
        { label: "account-4", token: "token4" },
      ])
    })

    test("should handle empty lines in file", async () => {
      const fileContent = "alice:token1\n\nbob:token2\n\n\ntoken3"

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ])
    })

    test("should handle Windows line endings", async () => {
      const fileContent = "alice:token1\r\nbob:token2\r\ntoken3"

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ])
    })

    test("should handle mixed line endings", async () => {
      const fileContent = "alice:token1\r\nbob:token2\ntoken3"

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
        { label: "account-3", token: "token3" },
      ])
    })

    test("should handle single token in file", async () => {
      const fileContent = "alice:token1"

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([{ label: "alice", token: "token1" }])
    })

    test("should handle empty file content", async () => {
      const fileContent = ""

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([])
    })

    test("should handle file with only whitespace", async () => {
      const fileContent = "   \n  \n   "

      const { parseTokensFromFile } = require("../../src/lib/token-parser")
      const result = await parseTokensFromFile(fileContent)

      expect(result).toEqual([])
    })
  })

  describe("loadTokensFromFile", () => {
    test("should load tokens from file when GH_TOKENS_FILE is set", async () => {
      // This test would need file system mocking
      const mockReadFile = require("../../src/lib/token-parser").__mockReadFile
      mockReadFile.mockResolvedValue("alice:token1\nbob:token2")

      process.env.GH_TOKENS_FILE = "/path/to/tokens.txt"

      const { loadTokensFromFile } = require("../../src/lib/token-parser")
      const result = await loadTokensFromFile()

      expect(result).toEqual([
        { label: "alice", token: "token1" },
        { label: "bob", token: "token2" },
      ])
    })

    test("should return empty array when GH_TOKENS_FILE is not set", async () => {
      delete process.env.GH_TOKENS_FILE

      const { loadTokensFromFile } = require("../../src/lib/token-parser")
      const result = await loadTokensFromFile()

      expect(result).toEqual([])
    })

    test("should handle file read errors gracefully", async () => {
      const mockReadFile = require("../../src/lib/token-parser").__mockReadFile
      mockReadFile.mockRejectedValue(new Error("File not found"))

      process.env.GH_TOKENS_FILE = "/path/to/nonexistent.txt"

      const { loadTokensFromFile } = require("../../src/lib/token-parser")

      // The function now gracefully handles file read errors by returning empty array
      const result = await loadTokensFromFile()
      expect(result).toEqual([])
    })
  })

  describe("Token validation", () => {
    test("should reject tokens with invalid format", () => {
      const { validateToken } = require("../../src/lib/token-parser")

      expect(() => validateToken("")).toThrow("Token cannot be empty")
      expect(() => validateToken("   ")).toThrow("Token cannot be empty")
      expect(() => validateToken("invalid:token:format")).toThrow(
        "Invalid token format",
      )
    })

    test("should accept valid tokens", () => {
      const { validateToken } = require("../../src/lib/token-parser")

      expect(() => validateToken("ghp_1234567890abcdef")).not.toThrow()
      expect(() => validateToken("github_pat_123")).not.toThrow()
      expect(() => validateToken("ghs_123")).not.toThrow()
    })
  })

  describe("Integration with environment and file", () => {
    test("should prioritize GH_TOKENS over GH_TOKENS_FILE", async () => {
      process.env.GH_TOKENS = "env:token1"
      process.env.GH_TOKENS_FILE = "/path/to/file"

      const mockReadFile = require("../../src/lib/token-parser").__mockReadFile
      mockReadFile.mockResolvedValue("file:token2")

      const { getAllTokens } = require("../../src/lib/token-parser")
      const result = await getAllTokens()

      expect(result).toEqual([{ label: "env", token: "token1" }])
    })

    test("should fall back to GH_TOKENS_FILE when GH_TOKENS is not set", async () => {
      delete process.env.GH_TOKENS
      process.env.GH_TOKENS_FILE = "/path/to/file"

      const mockReadFile = require("../../src/lib/token-parser").__mockReadFile
      mockReadFile.mockResolvedValue("file:token1")

      const { getAllTokens } = require("../../src/lib/token-parser")
      const result = await getAllTokens()

      expect(result).toEqual([{ label: "file", token: "token1" }])
    })

    test("should fall back to GH_TOKEN when no other sources available", async () => {
      delete process.env.GH_TOKENS
      delete process.env.GH_TOKENS_FILE
      process.env.GH_TOKEN = "fallback-token"

      const { getAllTokens } = require("../../src/lib/token-parser")
      const result = await getAllTokens()

      expect(result).toEqual([{ label: "account-1", token: "fallback-token" }])
    })
  })
})
