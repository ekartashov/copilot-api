import { test, expect, describe, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { HTTPError } from "../../../src/lib/http-error"

// Mock the state module
const mockState = {
  githubToken: "test-github-token"
}

mock.module("~/lib/state", () => ({
  state: mockState
}))

// Import after mocking
import { getGitHubUser } from "../../../src/services/github/get-user"

describe("getGitHubUser", () => {
  let fetchSpy: any

  beforeEach(() => {
    mockState.githubToken = "test-github-token"
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response())
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test("should fetch GitHub user successfully", async () => {
    const mockUserData = {
      login: "testuser",
      id: 12345,
      name: "Test User"
    }

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockUserData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))

    const result = await getGitHubUser()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith("https://api.github.com/user", {
      headers: {
        "authorization": "token test-github-token",
        "content-type": "application/json",
        "accept": "application/json"
      }
    })
    expect(result).toEqual(mockUserData)
  })

  test("should throw HTTPError on 401 Unauthorized", async () => {
    const errorResponse = new Response("Unauthorized", {
      status: 401,
      statusText: "Unauthorized"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    try {
      await getGitHubUser()
      expect.unreachable("Should have thrown an error")
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).message).toBe("Failed to get GitHub user")
      expect((error as HTTPError).response.status).toBe(401)
    }
  })

  test("should throw HTTPError on 403 Forbidden", async () => {
    const errorResponse = new Response("Forbidden", {
      status: 403,
      statusText: "Forbidden"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    await expect(getGitHubUser()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 404 Not Found", async () => {
    const errorResponse = new Response("Not Found", {
      status: 404,
      statusText: "Not Found"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    await expect(getGitHubUser()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 500 Internal Server Error", async () => {
    const errorResponse = new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    await expect(getGitHubUser()).rejects.toThrow(HTTPError)
  })

  test("should use correct API endpoint", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ login: "test" }), {
      status: 200
    }))

    await getGitHubUser()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://api.github.com/user"),
      expect.any(Object)
    )
  })

  test("should include authorization header with token", async () => {
    mockState.githubToken = "custom-token-123"
    
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ login: "test" }), {
      status: 200
    }))

    await getGitHubUser()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "authorization": "token custom-token-123"
        })
      })
    )
  })

  test("should include standard headers", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ login: "test" }), {
      status: 200
    }))

    await getGitHubUser()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "accept": "application/json"
        })
      })
    )
  })
})