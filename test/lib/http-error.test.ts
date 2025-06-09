import { test, expect, describe } from "bun:test"

import { HTTPError } from "../../src/lib/http-error"

describe("HTTPError", () => {
  test("should create HTTPError with response", () => {
    const mockResponse = new Response("Not Found", { status: 404 })
    const error = new HTTPError("HTTP Error: 404", mockResponse)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(HTTPError)
    expect(error.response).toBe(mockResponse)
    expect(error.message).toBe("HTTP Error: 404")
  })

  test("should create HTTPError with custom message", () => {
    const mockResponse = new Response("Unauthorized", { status: 401 })
    const customMessage = "Authentication failed"
    const error = new HTTPError(customMessage, mockResponse)

    expect(error.response).toBe(mockResponse)
    expect(error.message).toBe(customMessage)
  })

  test("should handle different status codes", () => {
    const responses = [
      { status: 400, text: "Bad Request" },
      { status: 401, text: "Unauthorized" },
      { status: 403, text: "Forbidden" },
      { status: 404, text: "Not Found" },
      { status: 500, text: "Internal Server Error" },
    ]

    for (const { status, text } of responses) {
      const mockResponse = new Response(text, { status })
      const error = new HTTPError(`HTTP Error: ${status}`, mockResponse)

      expect(error.message).toBe(`HTTP Error: ${status}`)
      expect(error.response.status).toBe(status)
    }
  })

  test("should preserve response properties", async () => {
    const responseBody = { error: "Invalid token" }
    const mockResponse = new Response(JSON.stringify(responseBody), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })

    const error = new HTTPError("Authentication failed", mockResponse)

    expect(error.response.status).toBe(401)
    expect(error.response.headers.get("Content-Type")).toBe("application/json")

    // Test that response body can still be read
    const body = await error.response.clone().json()
    expect(body).toEqual(responseBody)
  })

  test("should have correct error name", () => {
    const mockResponse = new Response("Error", { status: 500 })
    const error = new HTTPError("Server Error", mockResponse)

    expect(error.name).toBe("Error")
  })

  test("should be throwable and catchable", () => {
    const mockResponse = new Response("Error", { status: 500 })

    expect(() => {
      throw new HTTPError("Server Error", mockResponse)
    }).toThrow(HTTPError)

    try {
      throw new HTTPError("Test error", mockResponse)
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).message).toBe("Test error")
    }
  })
})
