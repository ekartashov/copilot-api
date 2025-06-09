import { test, expect, describe, mock, beforeEach } from "bun:test"

import { server } from "../../src/server"

// Mock the getModels service
const mockGetModels = mock(() =>
  Promise.resolve({
    object: "list",
    data: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        object: "model",
        vendor: "openai",
        version: "1.0",
        capabilities: {
          family: "gpt-4",
          limits: {
            max_context_window_tokens: 128000,
            max_output_tokens: 4096,
          },
          object: "model_capabilities",
          supports: {
            tool_calls: true,
            parallel_tool_calls: true,
          },
          tokenizer: "cl100k_base",
          type: "chat",
        },
        model_picker_enabled: true,
        preview: false,
      },
    ],
  }),
)

// Mock the module
mock.module("~/services/copilot/get-models", () => ({
  getModels: mockGetModels,
}))

describe("Models Route", () => {
  beforeEach(() => {
    mockGetModels.mockClear()
  })
  test("should return models list", async () => {
    const request = new Request("http://localhost:4141/v1/models", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    })

    const response = await server.fetch(request)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty("object", "list")
    expect(data).toHaveProperty("data")
    expect(Array.isArray(data.data)).toBe(true)
  })

  test("should handle service errors", async () => {
    // Mock getModels to throw an error
    mockGetModels.mockImplementationOnce(() =>
      Promise.reject(new Error("Service unavailable")),
    )

    const request = new Request("http://localhost:4141/v1/models", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    })

    const response = await server.fetch(request)

    // Should handle service errors appropriately
    expect([400, 500].includes(response.status)).toBe(true)
  })

  test("should handle invalid route", async () => {
    const request = new Request("http://localhost:4141/v1/invalid-route", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    })

    const response = await server.fetch(request)

    expect(response.status).toBe(404)
  })

  test("should handle preflight CORS request", async () => {
    const request = new Request("http://localhost:4141/v1/models", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    })

    const response = await server.fetch(request)

    expect([200, 204].includes(response.status)).toBe(true)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeTruthy()
  })
})
