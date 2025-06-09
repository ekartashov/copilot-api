import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test"

import { HTTPError } from "../../../src/lib/http-error"

// Mock the state module
const mockState = {
  githubToken: "test-github-token",
}

import { mock } from "bun:test"
mock.module("~/lib/state", () => ({
  state: mockState,
}))

describe("getCopilotToken", () => {
  let fetchSpy: any

  beforeEach(() => {
    mockState.githubToken = "test-github-token"
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response())
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test("should fetch Copilot token successfully", async () => {
    const mockTokenData = {
      token: "copilot-token-123",
      expires_at: 1703980799,
      refresh_in: 3600,
    }

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTokenData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )

    // Import dynamically to avoid module mock conflicts
    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    const result = await getCopilotToken()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/copilot_internal/v2/token",
      {
        headers: expect.objectContaining({
          authorization: "token test-github-token",
          "content-type": "application/json",
          accept: "application/json",
        }),
      },
    )
    expect(result).toEqual(mockTokenData)
  })

  test("should throw HTTPError on 401 Unauthorized", async () => {
    const errorResponse = new Response("Unauthorized", {
      status: 401,
      statusText: "Unauthorized",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await expect(getCopilotToken()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 403 Forbidden", async () => {
    const errorResponse = new Response("Forbidden", {
      status: 403,
      statusText: "Forbidden",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await expect(getCopilotToken()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 404 Not Found", async () => {
    const errorResponse = new Response("Not Found", {
      status: 404,
      statusText: "Not Found",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await expect(getCopilotToken()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 500 Internal Server Error", async () => {
    const errorResponse = new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await expect(getCopilotToken()).rejects.toThrow(HTTPError)
  })

  test("should use correct API endpoint", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: "test-token",
        }),
        {
          status: 200,
        },
      ),
    )

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await getCopilotToken()

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/copilot_internal/v2/token",
      expect.any(Object),
    )
  })

  test("should include GitHub token in authorization header", async () => {
    mockState.githubToken = "custom-github-token-456"

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: "test-token",
        }),
        {
          status: 200,
        },
      ),
    )

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await getCopilotToken()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "token custom-github-token-456",
        }),
      }),
    )
  })

  test("should handle network errors", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"))

    const { getCopilotToken } = await import(
      "../../../src/services/github/get-copilot-token"
    )
    await expect(getCopilotToken()).rejects.toThrow("Network error")
  })
})
