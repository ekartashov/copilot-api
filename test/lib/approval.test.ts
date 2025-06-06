import { test, expect, describe, mock } from "bun:test"
import { HTTPError } from "../../src/lib/http-error"

// Mock consola
const mockConsola = {
  prompt: mock(() => Promise.resolve(true))
}

mock.module("consola", () => ({
  default: mockConsola
}))

// Import after mocking
import { awaitApproval } from "../../src/lib/approval"

describe("awaitApproval", () => {
  test("should resolve when user approves", async () => {
    mockConsola.prompt.mockResolvedValueOnce(true)

    await expect(awaitApproval()).resolves.toBeUndefined()
    
    expect(mockConsola.prompt).toHaveBeenCalledWith(
      "Accept incoming request?",
      { type: "confirm" }
    )
  })

  test("should throw HTTPError when user rejects", async () => {
    mockConsola.prompt.mockResolvedValueOnce(false)

    await expect(awaitApproval()).rejects.toThrow(HTTPError)
    
    try {
      await awaitApproval()
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPError)
      expect((error as HTTPError).message).toBe("Request rejected")
      expect((error as HTTPError).response.status).toBe(403)
    }
  })

  test("should throw HTTPError when user cancels (undefined response)", async () => {
    // @ts-ignore - Testing undefined response scenario
    mockConsola.prompt.mockResolvedValueOnce(undefined)

    await expect(awaitApproval()).rejects.toThrow(HTTPError)
  })

  test("should use correct prompt message and type", async () => {
    mockConsola.prompt.mockResolvedValueOnce(true)

    await awaitApproval()

    expect(mockConsola.prompt).toHaveBeenCalledWith(
      "Accept incoming request?",
      { type: "confirm" }
    )
  })
})