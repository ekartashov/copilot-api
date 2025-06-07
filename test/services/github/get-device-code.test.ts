import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test"
import { HTTPError } from "../../../src/lib/http-error"

describe("getDeviceCode", () => {
  let fetchSpy: any

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(new Response())
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test("should fetch device code successfully", async () => {
    const mockDeviceResponse = {
      device_code: "device123",
      user_code: "USER123",
      verification_uri: "https://github.com/login/device",
      expires_in: 900,
      interval: 5
    }

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockDeviceResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }))

    // Import dynamically to avoid module mock conflicts
    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    const result = await getDeviceCode()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        client_id: "Iv1.b507a08c87ecfe98",
        scope: "read:user"
      })
    })
    expect(result).toEqual(mockDeviceResponse)
  })

  test("should throw HTTPError on 400 Bad Request", async () => {
    const errorResponse = new Response("Bad Request", {
      status: 400,
      statusText: "Bad Request"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await expect(getDeviceCode()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 422 Unprocessable Entity", async () => {
    const errorResponse = new Response("Unprocessable Entity", {
      status: 422,
      statusText: "Unprocessable Entity"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await expect(getDeviceCode()).rejects.toThrow(HTTPError)
  })

  test("should throw HTTPError on 500 Internal Server Error", async () => {
    const errorResponse = new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error"
    })

    fetchSpy.mockResolvedValueOnce(errorResponse)

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await expect(getDeviceCode()).rejects.toThrow(HTTPError)
  })

  test("should use correct GitHub API endpoint", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200
    }))

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await getDeviceCode()

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://github.com/login/device/code",
      expect.any(Object)
    )
  })

  test("should include correct client_id and scope in request body", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200
    }))

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await getDeviceCode()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          client_id: "Iv1.b507a08c87ecfe98",
          scope: "read:user"
        })
      })
    )
  })

  test("should use POST method", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200
    }))

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await getDeviceCode()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST"
      })
    )
  })

  test("should handle network errors", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network error"))

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await expect(getDeviceCode()).rejects.toThrow("Network error")
  })

  test("should include standard headers", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200
    }))

    const { getDeviceCode } = await import("../../../src/services/github/get-device-code")
    await getDeviceCode()

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