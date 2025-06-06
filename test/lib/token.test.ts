import { test, expect, describe, mock, beforeEach, afterEach } from "bun:test"
import { state } from "../../src/lib/state"

// Mock external dependencies
const mockGetCopilotToken = mock(() => Promise.resolve({
  token: "mock-copilot-token",
  refresh_in: 3600
}))

const mockGetDeviceCode = mock(() => Promise.resolve({
  device_code: "mock-device-code",
  user_code: "MOCK-1234",
  verification_uri: "https://github.com/login/device",
  expires_in: 900,
  interval: 5
}))

const mockPollAccessToken = mock(() => Promise.resolve("mock-github-token"))

const mockGetGitHubUser = mock(() => Promise.resolve({
  login: "test-user",
  id: 12345
}))

const mockFS = {
  readFile: mock(() => Promise.resolve("existing-token")),
  writeFile: mock(() => Promise.resolve())
}

// Mock the paths module to avoid fs calls during import
mock.module("~/lib/paths", () => ({
  PATHS: {
    APP_DIR: "/mock/app/dir",
    GITHUB_TOKEN_PATH: "/mock/app/dir/github_token"
  },
  ensurePaths: mock(() => Promise.resolve())
}))

// Mock modules
mock.module("~/services/github/get-copilot-token", () => ({
  getCopilotToken: mockGetCopilotToken
}))

mock.module("~/services/github/get-device-code", () => ({
  getDeviceCode: mockGetDeviceCode
}))

mock.module("~/services/github/poll-access-token", () => ({
  pollAccessToken: mockPollAccessToken
}))

mock.module("~/services/github/get-user", () => ({
  getGitHubUser: mockGetGitHubUser
}))

// Mock the fs module properly with default export
mock.module("node:fs/promises", () => ({
  default: mockFS
}))

// Mock console to prevent actual logging during tests
mock.module("consola", () => ({
  default: {
    start: mock(() => {}),
    info: mock(() => {}),
    debug: mock(() => {}),
    error: mock(() => {}),
  }
}))

// Import after mocking
import { setupCopilotToken, setupGitHubToken } from "../../src/lib/token"

describe("Token Management", () => {
  beforeEach(() => {
    // Reset state before each test
    state.githubToken = undefined
    state.copilotToken = undefined
    
    // Reset mocks
    mockGetCopilotToken.mockClear()
    mockGetDeviceCode.mockClear()
    mockPollAccessToken.mockClear()
    mockGetGitHubUser.mockClear()
    mockFS.readFile.mockClear()
    mockFS.writeFile.mockClear()
    
    // Reset mock implementations to defaults
    mockFS.readFile.mockImplementation(() => Promise.resolve("existing-token"))
    mockFS.writeFile.mockImplementation(() => Promise.resolve())
  })

  afterEach(() => {
    // Clear any intervals that might have been set (Bun doesn't have jest.clearAllTimers)
    // Manual cleanup if needed
  })

  describe("setupCopilotToken", () => {
    test("should setup copilot token and store in state", async () => {
      await setupCopilotToken()
      
      expect(mockGetCopilotToken).toHaveBeenCalledTimes(1)
      expect(state.copilotToken).toBe("mock-copilot-token")
    })

    test("should handle token refresh error", async () => {
      mockGetCopilotToken.mockImplementationOnce(() => 
        Promise.reject(new Error("Token refresh failed"))
      )

      await expect(setupCopilotToken()).rejects.toThrow("Token refresh failed")
    })
  })

  describe("setupGitHubToken", () => {
    test("should use existing token when available", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-github-token")
      
      await setupGitHubToken()
      
      expect(mockFS.readFile).toHaveBeenCalledTimes(1)
      expect(state.githubToken).toBe("existing-github-token")
      expect(mockGetGitHubUser).toHaveBeenCalledTimes(1)
      expect(mockGetDeviceCode).not.toHaveBeenCalled()
    })

    test("should get new token when none exists", async () => {
      mockFS.readFile.mockRejectedValueOnce(new Error("File not found"))
      
      await setupGitHubToken()
      
      expect(mockGetDeviceCode).toHaveBeenCalledTimes(1)
      expect(mockPollAccessToken).toHaveBeenCalledTimes(1)
      expect(mockFS.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        "mock-github-token"
      )
      expect(state.githubToken).toBe("mock-github-token")
      expect(mockGetGitHubUser).toHaveBeenCalledTimes(1)
    })

    test("should force new token when force option is true", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-token")
      
      await setupGitHubToken({ force: true })
      
      expect(mockGetDeviceCode).toHaveBeenCalledTimes(1)
      expect(mockPollAccessToken).toHaveBeenCalledTimes(1)
      expect(state.githubToken).toBe("mock-github-token")
    })

    test("should handle authentication errors", async () => {
      mockFS.readFile.mockRejectedValueOnce(new Error("File not found"))
      mockGetDeviceCode.mockRejectedValueOnce(new Error("Network error"))
      
      await expect(setupGitHubToken()).rejects.toThrow("Network error")
    })

    test("should handle user info fetch errors", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-token")
      mockGetGitHubUser.mockRejectedValueOnce(new Error("User fetch failed"))
      
      await expect(setupGitHubToken()).rejects.toThrow("User fetch failed")
    })
  })

  describe("Token persistence", () => {
    test("should write token to correct file path", async () => {
      mockFS.readFile.mockRejectedValueOnce(new Error("File not found"))
      
      await setupGitHubToken()
      
      expect(mockFS.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("github_token"),
        "mock-github-token"
      )
    })

    test("should read token from correct file path", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-token")
      
      await setupGitHubToken()
      
      expect(mockFS.readFile).toHaveBeenCalledWith(
        expect.stringContaining("github_token"),
        "utf8"
      )
    })
  })
})