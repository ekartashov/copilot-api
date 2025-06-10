import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test"

import { HTTPError } from "../../../src/lib/http-error"
import { getCopilotToken } from "../../../src/services/github/get-copilot-token"

describe("getCopilotToken", () => {
  let fetchSpy: any
  let mockState: any
  let mockAccountManager: any

  beforeEach(() => {
    mockState = {
      githubToken: "test-github-token",
      accountType: "individual",
      vsCodeVersion: "1.85.0",
    }

    mockAccountManager = {
      rotateOnRateLimit: () => {},
      updateState: () => {},
    }

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

    const result = await getCopilotToken({
      state: mockState,
      accountManager: mockAccountManager,
      fetch: fetchSpy,
    })

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

    await expect(
      getCopilotToken({
        state: mockState,
        accountManager: mockAccountManager,
        fetch: fetchSpy,
      }),
    ).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 403 Forbidden", async () => {
    const errorResponse = new Response("Forbidden", {
      status: 403,
      statusText: "Forbidden",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    await expect(
      getCopilotToken({
        state: mockState,
        accountManager: mockAccountManager,
        fetch: fetchSpy,
      }),
    ).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 404 Not Found", async () => {
    const errorResponse = new Response("Not Found", {
      status: 404,
      statusText: "Not Found",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    await expect(
      getCopilotToken({
        state: mockState,
        accountManager: mockAccountManager,
        fetch: fetchSpy,
      }),
    ).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 500 Internal Server Error", async () => {
    const errorResponse = new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    await expect(
      getCopilotToken({
        state: mockState,
        accountManager: mockAccountManager,
        fetch: fetchSpy,
      }),
    ).rejects.toThrow(HTTPError)
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

    await getCopilotToken({
      state: mockState,
      accountManager: mockAccountManager,
      fetch: fetchSpy,
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/copilot_internal/v2/token",
      expect.any(Object),
    )
  })

  test("should include GitHub token in authorization header", async () => {
    const customMockState = {
      ...mockState,
      githubToken: "custom-github-token-456",
    }

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

    await getCopilotToken({
      state: customMockState,
      accountManager: mockAccountManager,
      fetch: fetchSpy,
    })

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

    await expect(
      getCopilotToken({
        state: mockState,
        accountManager: mockAccountManager,
        fetch: fetchSpy,
      }),
    ).rejects.toThrow("Network error")
  })
})
