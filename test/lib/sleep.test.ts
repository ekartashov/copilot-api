import { test, expect, describe } from "bun:test"

import { sleep } from "../../src/lib/sleep"

describe("sleep", () => {
  test("should resolve after specified time", async () => {
    const start = Date.now()
    await sleep(100) // 100ms
    const end = Date.now()

    // Allow some tolerance for timing (±30ms)
    expect(end - start).toBeGreaterThanOrEqual(90)
    expect(end - start).toBeLessThan(160)
  })

  test("should resolve immediately for 0ms", async () => {
    const start = Date.now()
    await sleep(0)
    const end = Date.now()

    // Should be very fast, within 10ms
    expect(end - start).toBeLessThan(10)
  })

  test("should handle negative values", async () => {
    const start = Date.now()
    await sleep(-100)
    const end = Date.now()

    // Should resolve immediately
    expect(end - start).toBeLessThan(10)
  })
})
