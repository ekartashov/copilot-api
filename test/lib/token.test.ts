import { test, expect, describe, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { state } from "../../src/lib/state"

// Mock external dependencies - using runtime spies instead of global module mocks


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

// Note: Using runtime spies instead of global module mocks to avoid test isolation issues

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
  let getCopilotTokenSpy: any
  let getDeviceCodeSpy: any
  let pollAccessTokenSpy: any
  
  beforeEach(async () => {
    // Reset state before each test
    state.githubToken = undefined
    state.copilotToken = undefined
    
    // Reset FS mocks
    mockFS.readFile.mockClear()
    mockFS.writeFile.mockClear()
    
    // Reset mock implementations to defaults
    mockFS.readFile.mockImplementation(() => Promise.resolve("existing-token"))
    mockFS.writeFile.mockImplementation(() => Promise.resolve())
    
    // Spy on service functions instead of global module mocks to avoid test isolation issues
    getUserSpy = spyOn(await import("../../src/services/github/get-user"), "getGitHubUser")
    getUserSpy.mockResolvedValue({ login: "test-user", id: 12345 })
    
    getCopilotTokenSpy = spyOn(await import("../../src/services/github/get-copilot-token"), "getCopilotToken")
    getCopilotTokenSpy.mockResolvedValue({
      token: "mock-copilot-token",
      refresh_in: 3600
    })
    
    getDeviceCodeSpy = spyOn(await import("../../src/services/github/get-device-code"), "getDeviceCode")
    getDeviceCodeSpy.mockResolvedValue({
      device_code: "mock-device-code",
      user_code: "MOCK-1234",
      verification_uri: "https://github.com/login/device",
      expires_in: 900,
      interval: 5
    })
    
    pollAccessTokenSpy = spyOn(await import("../../src/services/github/poll-access-token"), "pollAccessToken")
    pollAccessTokenSpy.mockResolvedValue("mock-github-token")
  })

  afterEach(() => {
    // Restore all spies to avoid interference with other tests
    getUserSpy?.mockRestore()
    getCopilotTokenSpy?.mockRestore()
    getDeviceCodeSpy?.mockRestore()
    pollAccessTokenSpy?.mockRestore()
  })

  describe("setupCopilotToken", () => {
    test("should setup copilot token and store in state", async () => {
      await setupCopilotToken()
      
      expect(getCopilotTokenSpy).toHaveBeenCalledTimes(1)
      expect(state.copilotToken).toBe("mock-copilot-token")
    })

    test("should handle token refresh error", async () => {
      getCopilotTokenSpy.mockImplementationOnce(() =>
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
      expect(getDeviceCodeSpy).not.toHaveBeenCalled()
    })

    test("should get new token when none exists", async () => {
      const mockDeviceCode = {
        device_code: "mock-device-code",
        user_code: "MOCK-1234",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5
      }
      
      mockFS.readFile.mockImplementationOnce(() => Promise.reject(new Error("File not found")))
      getDeviceCodeSpy.mockResolvedValueOnce(mockDeviceCode)
      pollAccessTokenSpy.mockResolvedValueOnce("mock-github-token")
      getUserSpy.mockResolvedValueOnce({ login: "test-user", id: 12345 })
      
      try {
        await setupGitHubToken()
        
        expect(getDeviceCodeSpy).toHaveBeenCalledTimes(1)
        expect(pollAccessTokenSpy).toHaveBeenCalledWith(mockDeviceCode)
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
      
      expect(getDeviceCodeSpy).toHaveBeenCalledTimes(1)
      expect(pollAccessTokenSpy).toHaveBeenCalledTimes(1)
      expect(state.githubToken).toBe("mock-github-token")
    })

    test("should handle authentication errors", async () => {
      mockFS.readFile.mockImplementationOnce(() => Promise.reject(new Error("File not found")))
      getDeviceCodeSpy.mockRejectedValueOnce(new Error("Network error"))
      
      await expect(setupGitHubToken()).rejects.toThrow("Network error")
      expect(getDeviceCodeSpy).toHaveBeenCalledTimes(1)
    })

    test("should handle user info fetch errors", async () => {
      mockFS.readFile.mockResolvedValueOnce("existing-token")
      getUserSpy.mockRejectedValueOnce(new Error("User fetch failed"))
      
      await expect(setupGitHubToken()).rejects.toThrow("User fetch failed")
    })
  })

  describe("Token persistence", () => {
    test("should write token to correct file path", async () => {
      const mockDeviceCode = {
        device_code: "mock-device-code",
        user_code: "MOCK-1234",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5
      }
      
      mockFS.readFile.mockImplementationOnce(() => Promise.reject(new Error("File not found")))
      getDeviceCodeSpy.mockResolvedValueOnce(mockDeviceCode)
      pollAccessTokenSpy.mockResolvedValueOnce("test-token")
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