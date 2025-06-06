import { test, expect, describe, beforeEach } from "bun:test"
import { state } from "../../src/lib/state"

describe("State Management", () => {
  beforeEach(() => {
    // Reset state to defaults before each test
    state.accountType = "individual"
    state.manualApprove = false
    state.rateLimitWait = false
    state.visionEnabled = false
    state.githubToken = undefined
    state.copilotToken = undefined
    state.models = undefined
    state.vsCodeVersion = undefined
    state.rateLimitSeconds = undefined
    state.lastRequestTimestamp = undefined
  })

  test("should have default state values", () => {
    expect(state.accountType).toBe("individual")
    expect(state.manualApprove).toBe(false)
    expect(state.rateLimitWait).toBe(false)
    expect(state.visionEnabled).toBe(false)
    expect(state.githubToken).toBeUndefined()
    expect(state.copilotToken).toBeUndefined()
    expect(state.models).toBeUndefined()
    expect(state.vsCodeVersion).toBeUndefined()
    expect(state.rateLimitSeconds).toBeUndefined()
    expect(state.lastRequestTimestamp).toBeUndefined()
  })

  test("should allow updating state values", () => {
    // Save original state
    const originalAccountType = state.accountType
    const originalManualApprove = state.manualApprove

    // Update state
    state.accountType = "business"
    state.manualApprove = true
    state.rateLimitSeconds = 30
    state.githubToken = "test-token"

    // Verify updates
    expect(state.accountType).toBe("business")
    expect(state.manualApprove).toBe(true)
    expect(state.rateLimitSeconds).toBe(30)
    expect(state.githubToken).toBe("test-token")

    // Restore original state
    state.accountType = originalAccountType
    state.manualApprove = originalManualApprove
    state.rateLimitSeconds = undefined
    state.githubToken = undefined
  })

  test("should handle rate limiting timestamp", () => {
    const timestamp = Date.now()
    state.lastRequestTimestamp = timestamp
    expect(state.lastRequestTimestamp).toBe(timestamp)
  })

  test("should handle vision enabled flag", () => {
    state.visionEnabled = true
    expect(state.visionEnabled).toBe(true)
    
    state.visionEnabled = false
    expect(state.visionEnabled).toBe(false)
  })
})