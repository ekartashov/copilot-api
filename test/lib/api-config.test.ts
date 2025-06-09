import { test, expect, describe, mock } from "bun:test"

// Mock crypto module for randomUUID
const mockRandomUUID = mock(() => "mock-uuid-1234")
mock.module("node:crypto", () => ({
  randomUUID: mockRandomUUID,
}))

import type { State } from "../../src/lib/state"

// Import after mocking
import {
  standardHeaders,
  copilotBaseUrl,
  copilotHeaders,
  githubHeaders,
  GITHUB_API_BASE_URL,
  GITHUB_BASE_URL,
  GITHUB_CLIENT_ID,
  GITHUB_APP_SCOPES,
} from "../../src/lib/api-config"

describe("standardHeaders", () => {
  test("should return correct content-type and accept headers", () => {
    const headers = standardHeaders()

    expect(headers).toEqual({
      "content-type": "application/json",
      accept: "application/json",
    })
  })
})

describe("copilotBaseUrl", () => {
  test("should return correct URL for individual account", () => {
    const state: Partial<State> = {
      accountType: "individual",
    }

    const url = copilotBaseUrl(state as State)
    expect(url).toBe("https://api.individual.githubcopilot.com")
  })

  test("should return correct URL for business account", () => {
    const state: Partial<State> = {
      accountType: "business",
    }

    const url = copilotBaseUrl(state as State)
    expect(url).toBe("https://api.business.githubcopilot.com")
  })
})

describe("copilotHeaders", () => {
  test("should return complete headers for basic state", () => {
    const state: Partial<State> = {
      copilotToken: "test-copilot-token",
      vsCodeVersion: "1.85.0",
      visionEnabled: false,
    }

    const headers = copilotHeaders(state as State)

    expect(headers).toMatchObject({
      Authorization: "Bearer test-copilot-token",
      "content-type": "application/json",
      "copilot-integration-id": "vscode-chat",
      "editor-version": "vscode/1.85.0",
      "editor-plugin-version": "copilot-chat/0.26.7",
      "user-agent": "GitHubCopilotChat/0.26.7",
      "openai-intent": "conversation-panel",
      "x-github-api-version": "2025-04-01",
      "x-request-id": "mock-uuid-1234",
      "x-vscode-user-agent-library-version": "electron-fetch",
    })

    expect(headers).not.toHaveProperty("copilot-vision-request")
  })

  test("should include vision header when vision is enabled", () => {
    const state: Partial<State> = {
      copilotToken: "test-copilot-token",
      vsCodeVersion: "1.85.0",
      visionEnabled: true,
    }

    const headers = copilotHeaders(state as State)

    expect(headers).toHaveProperty("copilot-vision-request", "true")
  })

  test("should generate unique request IDs", () => {
    const state: Partial<State> = {
      copilotToken: "test-token",
      vsCodeVersion: "1.85.0",
      visionEnabled: false,
    }

    // First call
    const headers1 = copilotHeaders(state as State)

    // Mock a different UUID for second call
    mockRandomUUID.mockReturnValueOnce("mock-uuid-5678")
    const headers2 = copilotHeaders(state as State)

    expect(headers1["x-request-id"]).toBe("mock-uuid-1234")
    expect(headers2["x-request-id"]).toBe("mock-uuid-5678")
  })
})

describe("githubHeaders", () => {
  test("should return correct GitHub API headers", () => {
    const state: Partial<State> = {
      githubToken: "test-github-token",
      vsCodeVersion: "1.85.0",
    }

    const headers = githubHeaders(state as State)

    expect(headers).toEqual({
      "content-type": "application/json",
      accept: "application/json",
      authorization: "token test-github-token",
      "editor-version": "vscode/1.85.0",
      "editor-plugin-version": "copilot-chat/0.26.7",
      "user-agent": "GitHubCopilotChat/0.26.7",
      "x-github-api-version": "2025-04-01",
      "x-vscode-user-agent-library-version": "electron-fetch",
    })
  })

  test("should use standard headers as base", () => {
    const state: Partial<State> = {
      githubToken: "test-token",
      vsCodeVersion: "1.85.0",
    }

    const headers = githubHeaders(state as State)
    const standard = standardHeaders()

    expect(headers["content-type"]).toBe(standard["content-type"])
    expect(headers["accept"]).toBe(standard["accept"])
  })
})

describe("Constants", () => {
  test("should have correct GitHub API base URL", () => {
    expect(GITHUB_API_BASE_URL).toBe("https://api.github.com")
  })

  test("should have correct GitHub base URL", () => {
    expect(GITHUB_BASE_URL).toBe("https://github.com")
  })

  test("should have correct GitHub client ID", () => {
    expect(GITHUB_CLIENT_ID).toBe("Iv1.b507a08c87ecfe98")
  })

  test("should have correct GitHub app scopes", () => {
    expect(GITHUB_APP_SCOPES).toBe("read:user")
  })
})
