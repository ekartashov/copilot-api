import { test, expect, describe, mock, beforeEach } from "bun:test"
import os from "node:os"
import path from "node:path"

// Mock fs module
const mockFS = {
  mkdir: mock(() => Promise.resolve()),
  access: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  chmod: mock(() => Promise.resolve()),
  constants: {
    W_OK: 2,
  },
}

mock.module("node:fs/promises", () => ({
  default: mockFS,
}))

// Import after mocking
import { PATHS, ensurePaths } from "../../src/lib/paths"

describe("PATHS", () => {
  test("should define correct paths", () => {
    const expectedAppDir = path.join(
      os.homedir(),
      ".local",
      "share",
      "copilot-api",
    )
    const expectedTokenPath = path.join(expectedAppDir, "github_token")

    expect(PATHS.APP_DIR).toBe(expectedAppDir)
    expect(PATHS.GH_TOKEN_PATH).toBe(expectedTokenPath)
  })

  test("APP_DIR should be under user's home directory", () => {
    expect(PATHS.APP_DIR).toContain(os.homedir())
    expect(PATHS.APP_DIR).toContain(".local/share/copilot-api")
  })

  test("GH_TOKEN_PATH should be in APP_DIR", () => {
    expect(PATHS.GH_TOKEN_PATH).toContain(PATHS.APP_DIR)
    expect(PATHS.GH_TOKEN_PATH).toEndWith("github_token")
  })
})

describe("ensurePaths", () => {
  beforeEach(() => {
    mockFS.mkdir.mockClear()
    mockFS.access.mockClear()
    mockFS.writeFile.mockClear()
    mockFS.chmod.mockClear()
  })

  test("should create app directory recursively", async () => {
    mockFS.access.mockResolvedValueOnce(undefined) // File exists and is writable

    await ensurePaths()

    expect(mockFS.mkdir).toHaveBeenCalledWith(PATHS.APP_DIR, {
      recursive: true,
    })
  })

  test("should ensure github token file exists when file is accessible", async () => {
    mockFS.access.mockResolvedValueOnce(undefined) // File exists and is writable

    await ensurePaths()

    expect(mockFS.access).toHaveBeenCalledWith(
      PATHS.GH_TOKEN_PATH,
      mockFS.constants.W_OK,
    )
    expect(mockFS.writeFile).not.toHaveBeenCalled()
    expect(mockFS.chmod).not.toHaveBeenCalled()
  })

  test("should create github token file when it doesn't exist", async () => {
    mockFS.access.mockRejectedValueOnce(new Error("File not found"))

    await ensurePaths()

    expect(mockFS.access).toHaveBeenCalledWith(
      PATHS.GH_TOKEN_PATH,
      mockFS.constants.W_OK,
    )
    expect(mockFS.writeFile).toHaveBeenCalledWith(PATHS.GH_TOKEN_PATH, "")
    expect(mockFS.chmod).toHaveBeenCalledWith(PATHS.GH_TOKEN_PATH, 0o600)
  })

  test("should handle mkdir errors gracefully", async () => {
    mockFS.mkdir.mockRejectedValueOnce(new Error("Permission denied"))

    await expect(ensurePaths()).rejects.toThrow("Permission denied")
  })

  test("should handle file creation errors gracefully", async () => {
    mockFS.access.mockRejectedValueOnce(new Error("File not found"))
    mockFS.writeFile.mockRejectedValueOnce(new Error("Permission denied"))

    await expect(ensurePaths()).rejects.toThrow("Permission denied")
  })
})
