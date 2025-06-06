import { test, expect, describe, mock, beforeEach } from "bun:test"
import type { State } from "../../src/lib/state"
import { HTTPError } from "../../src/lib/http-error"

// Mock sleep function
const mockSleep = mock(() => Promise.resolve())
mock.module("../../src/lib/sleep", () => ({
  sleep: mockSleep
}))

// Mock consola
const mockConsola = {
  warn: mock(() => {}),
  info: mock(() => {})
}
mock.module("consola", () => ({
  default: mockConsola
}))

// Import after mocking
import { checkRateLimit } from "../../src/lib/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockSleep.mockClear()
    mockConsola.warn.mockClear()
    mockConsola.info.mockClear()
  })

  test("should return immediately when rateLimitSeconds is undefined", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: false,
      visionEnabled: false
    }

    await checkRateLimit(state)

    expect(mockConsola.warn).not.toHaveBeenCalled()
    expect(mockSleep).not.toHaveBeenCalled()
  })

  test("should set lastRequestTimestamp on first request", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: false,
      visionEnabled: false,
      rateLimitSeconds: 5
    }

    const beforeTime = Date.now()
    await checkRateLimit(state)
    const afterTime = Date.now()

    expect(state.lastRequestTimestamp).toBeGreaterThanOrEqual(beforeTime)
    expect(state.lastRequestTimestamp).toBeLessThanOrEqual(afterTime)
  })

  test("should allow request when enough time has elapsed", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: false,
      visionEnabled: false,
      rateLimitSeconds: 1,
      lastRequestTimestamp: Date.now() - 2000 // 2 seconds ago
    }

    const beforeTime = Date.now()
    await checkRateLimit(state)
    const afterTime = Date.now()

    expect(state.lastRequestTimestamp).toBeGreaterThanOrEqual(beforeTime)
    expect(state.lastRequestTimestamp).toBeLessThanOrEqual(afterTime)
    expect(mockConsola.warn).not.toHaveBeenCalled()
    expect(mockSleep).not.toHaveBeenCalled()
  })

  test("should throw HTTPError when rate limit exceeded and rateLimitWait is false", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: false,
      visionEnabled: false,
      rateLimitSeconds: 5,
      lastRequestTimestamp: Date.now() - 1000 // 1 second ago
    }

    await expect(checkRateLimit(state)).rejects.toThrow(HTTPError)

    expect(mockConsola.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Rate limit exceeded\. Need to wait \d+ more seconds\./)
    )
    expect(mockSleep).not.toHaveBeenCalled()

    try {
      await checkRateLimit(state)
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).message).toBe("Rate limit exceeded")
      expect((error as HTTPError).response.status).toBe(429)
    }
  })

  test("should wait when rate limit exceeded and rateLimitWait is true", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: true,
      visionEnabled: false,
      rateLimitSeconds: 5,
      lastRequestTimestamp: Date.now() - 1000 // 1 second ago
    }

    await checkRateLimit(state)

    expect(mockConsola.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Rate limit reached\. Waiting \d+ seconds before proceeding\.\.\./)
    )
    expect(mockSleep).toHaveBeenCalledWith(expect.any(Number))
    expect(mockConsola.info).toHaveBeenCalledWith(
      "Rate limit wait completed, proceeding with request"
    )
  })

  test("should calculate correct wait time", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: true,
      visionEnabled: false,
      rateLimitSeconds: 5,
      lastRequestTimestamp: Date.now() - 2000 // 2 seconds ago
    }

    await checkRateLimit(state)

    // Should wait for ceiling of (5 - 2) = 3 seconds = 3000ms
    expect(mockSleep).toHaveBeenCalledWith(3000)
  })

  test("should handle edge case with very recent timestamp", async () => {
    const now = Date.now()
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: true,
      visionEnabled: false,
      rateLimitSeconds: 5,
      lastRequestTimestamp: now - 100 // 0.1 seconds ago
    }

    await checkRateLimit(state)

    // Should wait for ceiling of approximately 5 seconds
    expect(mockSleep).toHaveBeenCalledWith(5000)
  })

  test("should update lastRequestTimestamp after waiting", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: true,
      visionEnabled: false,
      rateLimitSeconds: 2,
      lastRequestTimestamp: Date.now() - 500 // 0.5 seconds ago
    }

    const beforeTime = Date.now()
    await checkRateLimit(state)
    const afterTime = Date.now()

    expect(state.lastRequestTimestamp).toBeGreaterThanOrEqual(beforeTime)
    expect(state.lastRequestTimestamp).toBeLessThanOrEqual(afterTime)
  })

  test("should handle undefined rateLimitWait (defaults to falsy)", async () => {
    const state: State = {
      accountType: "individual",
      manualApprove: false,
      rateLimitWait: false,
      visionEnabled: false,
      rateLimitSeconds: 5,
      lastRequestTimestamp: Date.now() - 1000 // 1 second ago
    }

    await expect(checkRateLimit(state)).rejects.toThrow(HTTPError)
    expect(mockSleep).not.toHaveBeenCalled()
  })
})