import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test"

describe("cacheVSCodeVersion", () => {
  let getVSCodeVersionSpy: any
  let consolaSpy: any
  let originalState: any

  beforeEach(async () => {
    // Import modules dynamically to avoid module mock conflicts
    const vscodeService = await import("../../src/services/get-vscode-version")
    const consola = (await import("consola")).default
    const { state } = await import("../../src/lib/state")

    // Store original state
    originalState = state.vsCodeVersion

    // Create spies instead of module mocks
    getVSCodeVersionSpy = spyOn(
      vscodeService,
      "getVSCodeVersion",
    ).mockImplementation(() => Promise.resolve("1.95.0"))

    // Spy on the consola mock (which may be a mock function from global mocks)
    consolaSpy = spyOn(consola, "info")

    // Reset state
    state.vsCodeVersion = undefined
  })

  afterEach(async () => {
    // Restore spies
    getVSCodeVersionSpy?.mockRestore()
    consolaSpy?.mockRestore()

    // Restore original state
    const { state } = await import("../../src/lib/state")
    state.vsCodeVersion = originalState
  })

  test("should fetch VSCode version and cache it in state", async () => {
    // Import cacheVSCodeVersion dynamically to ensure it uses current module state
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = "1.95.0"
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(getVSCodeVersionSpy).toHaveBeenCalledTimes(1)

    const { state } = await import("../../src/lib/state")
    expect(state.vsCodeVersion).toBe(mockVersion)
  })

  test("should log VSCode version information", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = "1.94.2"
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(consolaSpy).toHaveBeenCalledTimes(1)
    expect(consolaSpy).toHaveBeenCalledWith("Using VSCode version: 1.94.2")
  })

  test("should handle different version formats", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = "1.93.1-insider"
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    const { state } = await import("../../src/lib/state")
    expect(state.vsCodeVersion).toBe(mockVersion)
    expect(consolaSpy).toHaveBeenCalledWith(
      "Using VSCode version: 1.93.1-insider",
    )
  })

  test("should handle empty version string", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = ""
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    const { state } = await import("../../src/lib/state")
    expect(state.vsCodeVersion).toBe(mockVersion)
    expect(consolaSpy).toHaveBeenCalledWith("Using VSCode version: ")
  })

  test("should propagate errors from getVSCodeVersion", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockError = new Error("Failed to get VSCode version")
    getVSCodeVersionSpy.mockRejectedValueOnce(mockError)

    await expect(cacheVSCodeVersion()).rejects.toThrow(
      "Failed to get VSCode version",
    )

    const { state } = await import("../../src/lib/state")
    expect(state.vsCodeVersion).toBeUndefined()
    expect(consolaSpy).not.toHaveBeenCalled()
  })

  test("should overwrite previous version cache", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")
    const { state } = await import("../../src/lib/state")

    // Set initial state
    state.vsCodeVersion = "1.90.0"

    const newVersion = "1.95.0"
    getVSCodeVersionSpy.mockResolvedValueOnce(newVersion)

    await cacheVSCodeVersion()

    expect(state.vsCodeVersion).toBe(newVersion)
    expect(state.vsCodeVersion).not.toBe("1.90.0")
  })

  test("should return void", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = "1.95.0"
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    const result = await cacheVSCodeVersion()

    expect(result).toBeUndefined()
  })

  test("should handle version with build metadata", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = "1.95.0+build.123"
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    const { state } = await import("../../src/lib/state")
    expect(state.vsCodeVersion).toBe(mockVersion)
    expect(consolaSpy).toHaveBeenCalledWith(
      "Using VSCode version: 1.95.0+build.123",
    )
  })

  test("should handle pre-release versions", async () => {
    const { cacheVSCodeVersion } = await import("../../src/lib/vscode-version")

    const mockVersion = "1.96.0-alpha.1"
    getVSCodeVersionSpy.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    const { state } = await import("../../src/lib/state")
    expect(state.vsCodeVersion).toBe(mockVersion)
    expect(consolaSpy).toHaveBeenCalledWith(
      "Using VSCode version: 1.96.0-alpha.1",
    )
  })
})
