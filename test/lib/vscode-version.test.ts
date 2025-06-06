import { test, expect, describe, mock, beforeEach } from "bun:test"

// Mock getVSCodeVersion service
const mockGetVSCodeVersion = mock(() => Promise.resolve("1.95.0"))

mock.module("../../src/services/get-vscode-version", () => ({
  getVSCodeVersion: mockGetVSCodeVersion
}))

// Mock consola
const mockConsola = {
  info: mock(() => {})
}
mock.module("consola", () => ({
  default: mockConsola
}))

// Mock state
const mockState: any = {
  vsCodeVersion: undefined
}
mock.module("../../src/lib/state", () => ({
  state: mockState
}))

// Import after mocking
import { cacheVSCodeVersion } from "../../src/lib/vscode-version"

describe("cacheVSCodeVersion", () => {
  beforeEach(() => {
    mockGetVSCodeVersion.mockClear()
    mockConsola.info.mockClear()
    mockState.vsCodeVersion = undefined
  })

  test("should fetch VSCode version and cache it in state", async () => {
    const mockVersion = "1.95.0"
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(mockGetVSCodeVersion).toHaveBeenCalledTimes(1)
    expect(mockState.vsCodeVersion).toBe(mockVersion)
  })

  test("should log VSCode version information", async () => {
    const mockVersion = "1.94.2"
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(mockConsola.info).toHaveBeenCalledTimes(1)
    expect(mockConsola.info).toHaveBeenCalledWith("Using VSCode version: 1.94.2")
  })

  test("should handle different version formats", async () => {
    const mockVersion = "1.93.1-insider"
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(mockState.vsCodeVersion).toBe(mockVersion)
    expect(mockConsola.info).toHaveBeenCalledWith("Using VSCode version: 1.93.1-insider")
  })

  test("should handle empty version string", async () => {
    const mockVersion = ""
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(mockState.vsCodeVersion).toBe(mockVersion)
    expect(mockConsola.info).toHaveBeenCalledWith("Using VSCode version: ")
  })

  test("should propagate errors from getVSCodeVersion", async () => {
    const mockError = new Error("Failed to get VSCode version")
    mockGetVSCodeVersion.mockRejectedValueOnce(mockError)

    await expect(cacheVSCodeVersion()).rejects.toThrow("Failed to get VSCode version")
    
    expect(mockState.vsCodeVersion).toBeUndefined()
    expect(mockConsola.info).not.toHaveBeenCalled()
  })

  test("should overwrite previous version cache", async () => {
    // Set initial state
    mockState.vsCodeVersion = "1.90.0"

    const newVersion = "1.95.0"
    mockGetVSCodeVersion.mockResolvedValueOnce(newVersion)

    await cacheVSCodeVersion()

    expect(mockState.vsCodeVersion).toBe(newVersion)
    expect(mockState.vsCodeVersion).not.toBe("1.90.0")
  })

  test("should return void", async () => {
    const mockVersion = "1.95.0"
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    const result = await cacheVSCodeVersion()

    expect(result).toBeUndefined()
  })

  test("should handle version with build metadata", async () => {
    const mockVersion = "1.95.0+build.123"
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(mockState.vsCodeVersion).toBe(mockVersion)
    expect(mockConsola.info).toHaveBeenCalledWith("Using VSCode version: 1.95.0+build.123")
  })

  test("should handle pre-release versions", async () => {
    const mockVersion = "1.96.0-alpha.1"
    mockGetVSCodeVersion.mockResolvedValueOnce(mockVersion)

    await cacheVSCodeVersion()

    expect(mockState.vsCodeVersion).toBe(mockVersion)
    expect(mockConsola.info).toHaveBeenCalledWith("Using VSCode version: 1.96.0-alpha.1")
  })
})