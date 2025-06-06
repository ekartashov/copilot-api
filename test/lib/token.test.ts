import { test, expect, describe, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { state } from "../../src/lib/state"

// Mock external dependencies
const mockGetCopilotToken = mock(() => Promise.resolve({
  token: "mock-copilot-token",
  refresh_in: 3600
}))

const mockDeviceCode = {
  device_code: "mock-device-code",
  user_code: "MOCK-1234",
  verification_uri: "https://github.com/login/device",
  expires_in: 900,
  interval: 5
}

const mockGetDeviceCode = mock(() => Promise.resolve(mockDeviceCode))

const mockPollAccessToken = mock(() => Promise.resolve("mock-github-token"))


// Create fs mocks
const mockFS = {
  readFile: mock(() => Promise.resolve("existing-token")),
  writeFile: mock(() => Promise.resolve())
}

// Mock the fs module at the top level BEFORE any imports
mock.module("node:fs/promises", () => ({
  default: mockFS
}))

// Mock the paths module to avoid fs calls during import
mock.module("~/lib/paths", () => ({
  PATHS: {
    APP_DIR: "/mock/app/dir",
    GITHUB_TOKEN_PATH: "/mock/app/dir/github_token"
  },
  ensurePaths: mock(() => Promise.resolve())
}))

// Mock service modules
mock.module("~/services/github/get-copilot-token", () => ({
  getCopilotToken: mockGetCopilotToken
}))

mock.module("~/services/github/get-device-code", () => ({
  getDeviceCode: mockGetDeviceCode
}))

mock.module("~/services/github/poll-access-token", () => ({
  pollAccessToken: mockPollAccessToken
}))

// Note: We'll mock getGitHubUser via spyOn in the test setup instead of global module mock

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
import { getGitHubUser } from "../../src/services/github/get-user"

describe("Token Management", () => {
  let getUserSpy: any
  
  beforeEach(async () => {
    // Reset state before each test
    state.githubToken = undefined
    state.copilotToken = undefined
    
    // Reset mocks
    mockGetCopilotToken.mockClear()
    mockGetDeviceCode.mockClear()
    mockPollAccessToken.mockClear()
    mockFS.readFile.mockClear()
    mockFS.writeFile.mockClear()
    
    // Reset mock implementations to defaults
    mockFS.readFile.mockImplementation(() => Promise.resolve("existing-token"))
    mockFS.writeFile.mockImplementation(() => Promise.resolve())
    
    // Spy on getGitHubUser instead of global module mock
    getUserSpy = spyOn(await import("../../src/services/github/get-user"), "getGitHubUser")
    getUserSpy.mockResolvedValue({ login: "test-user", id: 12345 })
  })

  afterEach(() => {
    // Restore the spy to avoid interference with other tests
    getUserSpy?.mockRestore()
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
      expect(getUserSpy).toHaveBeenCalledTimes(1)
      expect(mockGetDeviceCode).not.toHaveBeenCalled()
    })

    test("should get new token when none exists", async () => {
      mockFS.readFile.mockImplementationOnce(() => Promise.reject(new Error("File not found")))
      mockGetDeviceCode.mockResolvedValueOnce(mockDeviceCode)
      mockPollAccessToken.mockResolvedValueOnce("mock-github-token")
      getUserSpy.mockResolvedValueOnce({ login: "test-user", id: 12345 })
      
      try {
        await setupGitHubToken()
        
        expect(mockGetDeviceCode).toHaveBeenCalledTimes(1)
        expect(mockPollAccessToken).toHaveBeenCalledWith(mockDeviceCode)
        expect(mockFS.writeFile).toHaveBeenCalledWith(
          expect.stringContaining("github_token"),
          "mock-github-token"
        )
        expect(state.githubToken).toBe("mock-github-token")
        expect(getUserSpy).toHaveBeenCalledWith()
      } catch (error) {
        // If we get here, the function didn't handle the readFile error properly
        console.error("setupGitHubToken threw:", error)
        throw error
      }
    })

    test("should force new token when force option is true", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-token")
      
      await setupGitHubToken({ force: true })
      
      expect(mockGetDeviceCode).toHaveBeenCalledTimes(1)
      expect(mockPollAccessToken).toHaveBeenCalledTimes(1)
      expect(state.githubToken).toBe("mock-github-token")
    })

    test("should handle authentication errors", async () => {
      mockFS.readFile.mockImplementationOnce(() => Promise.reject(new Error("File not found")))
      mockGetDeviceCode.mockRejectedValueOnce(new Error("Network error"))
      
      await expect(setupGitHubToken()).rejects.toThrow("Network error")
      expect(mockGetDeviceCode).toHaveBeenCalledTimes(1)
    })

    test("should handle user info fetch errors", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-token")
      getUserSpy.mockRejectedValueOnce(new Error("User fetch failed"))
      
      await expect(setupGitHubToken()).rejects.toThrow("User fetch failed")
    })
  })

  describe("Token persistence", () => {
    test("should write token to correct file path", async () => {
      mockFS.readFile.mockImplementationOnce(() => Promise.reject(new Error("File not found")))
      mockGetDeviceCode.mockResolvedValueOnce(mockDeviceCode)
      mockPollAccessToken.mockResolvedValueOnce("test-token")
      getUserSpy.mockResolvedValueOnce({ login: "test-user", id: 12345 })
      
      await setupGitHubToken()
      
      expect(mockFS.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("github_token"),
        "test-token"
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