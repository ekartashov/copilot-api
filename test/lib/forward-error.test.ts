import { test, expect, describe, mock } from "bun:test"
import { Hono } from "hono"
import { HTTPError } from "../../src/lib/http-error"

// Mock consola
const mockConsola = {
  error: mock(() => {})
}
mock.module("consola", () => ({
  default: mockConsola
}))

// Import after mocking
import { forwardError } from "../../src/lib/forward-error"

describe("forwardError", () => {
  const app = new Hono()
  
  test("should handle HTTPError and return error response", async () => {
    const mockResponse = new Response("Unauthorized access", { 
      status: 401,
      statusText: "Unauthorized"
    })
    const httpError = new HTTPError("Auth failed", mockResponse)
    
    // Create a mock context
    const mockContext = {
      json: mock((data: any, status?: number) => ({
        data,
        status,
        ok: status ? status < 400 : true
      }))
    }
    
    const result = await forwardError(mockContext as any, httpError)
    
    expect(mockConsola.error).toHaveBeenCalledWith("Error occurred:", httpError)
    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          message: "Unauthorized access",
          type: "error"
        }
      },
      401
    )
  })

  test("should handle regular Error and return 500", async () => {
    const regularError = new Error("Something went wrong")
    
    const mockContext = {
      json: mock((data: any, status?: number) => ({
        data,
        status,
        ok: status ? status < 400 : true
      }))
    }
    
    const result = await forwardError(mockContext as any, regularError)
    
    expect(mockConsola.error).toHaveBeenCalledWith("Error occurred:", regularError)
    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          message: "Something went wrong",
          type: "error"
        }
      },
      500
    )
  })

  test("should handle unknown error types", async () => {
    const unknownError = "String error"
    
    const mockContext = {
      json: mock((data: any, status?: number) => ({
        data,
        status,
        ok: status ? status < 400 : true
      }))
    }
    
    const result = await forwardError(mockContext as any, unknownError)
    
    expect(mockConsola.error).toHaveBeenCalledWith("Error occurred:", unknownError)
    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          message: "String error",
          type: "error"
        }
      },
      500
    )
  })

  test("should handle HTTPError with different status codes", async () => {
    const mockResponse = new Response("Service temporarily unavailable", { 
      status: 503,
      statusText: "Service Unavailable"
    })
    const httpError = new HTTPError("Service error", mockResponse)
    
    const mockContext = {
      json: mock((data: any, status?: number) => ({
        data,
        status,
        ok: status ? status < 400 : true
      }))
    }
    
    await forwardError(mockContext as any, httpError)
    
    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          message: "Service temporarily unavailable",
          type: "error"
        }
      },
      503
    )
  })

  test("should handle error without message property", async () => {
    const errorWithoutMessage = { someProperty: "value" }
    
    const mockContext = {
      json: mock((data: any, status?: number) => ({
        data,
        status,
        ok: status ? status < 400 : true
      }))
    }
    
    await forwardError(mockContext as any, errorWithoutMessage)
    
    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          message: undefined,
          type: "error"
        }
      },
      500
    )
  })
})