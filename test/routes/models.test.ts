import { test, expect, describe } from "bun:test"
import { server } from "../../src/server"

describe("Models Route", () => {
  test("should return models list", async () => {
    const request = new Request("http://localhost:4141/v1/models", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      }
    })

    const response = await server.fetch(request)
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty("object", "list")
    expect(data).toHaveProperty("data")
    expect(Array.isArray(data.data)).toBe(true)
  })

  test("should handle missing authorization", async () => {
    const request = new Request("http://localhost:4141/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })

    const response = await server.fetch(request)
    
    // Should handle unauthorized request appropriately
    expect([401, 403, 500].includes(response.status)).toBe(true)
  })

  test("should handle invalid route", async () => {
    const request = new Request("http://localhost:4141/v1/invalid-route", {
      method: "GET",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      }
    })

    const response = await server.fetch(request)
    
    expect(response.status).toBe(404)
  })

  test("should handle preflight CORS request", async () => {
    const request = new Request("http://localhost:4141/v1/models", {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"
      }
    })

    const response = await server.fetch(request)
    
    expect([200, 204].includes(response.status)).toBe(true)
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeTruthy()
  })
})