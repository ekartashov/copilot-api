import { test, expect, describe } from "bun:test"

import { isNullish } from "../../src/lib/is-nullish"

describe("isNullish", () => {
  test("should return true for null", () => {
    expect(isNullish(null)).toBe(true)
  })

  test("should return true for undefined", () => {
    expect(isNullish(undefined)).toBe(true)
  })

  test("should return false for empty string", () => {
    expect(isNullish("")).toBe(false)
  })

  test("should return false for zero", () => {
    expect(isNullish(0)).toBe(false)
  })

  test("should return false for false", () => {
    expect(isNullish(false)).toBe(false)
  })

  test("should return false for empty array", () => {
    expect(isNullish([])).toBe(false)
  })

  test("should return false for empty object", () => {
    expect(isNullish({})).toBe(false)
  })

  test("should return false for strings", () => {
    expect(isNullish("hello")).toBe(false)
    expect(isNullish("null")).toBe(false)
    expect(isNullish("undefined")).toBe(false)
  })

  test("should return false for numbers", () => {
    expect(isNullish(42)).toBe(false)
    expect(isNullish(-1)).toBe(false)
    expect(isNullish(3.14)).toBe(false)
    expect(isNullish(Infinity)).toBe(false)
    expect(isNullish(Number.NaN)).toBe(false)
  })

  test("should work with complex objects", () => {
    const obj = { key: "value" }
    const arr = [1, 2, 3]
    const func = () => {}

    expect(isNullish(obj)).toBe(false)
    expect(isNullish(arr)).toBe(false)
    expect(isNullish(func)).toBe(false)
  })

  test("should work as type guard", () => {
    const value: string | null | undefined =
      Math.random() > 0.5 ? "hello" : null

    if (isNullish(value)) {
      // TypeScript should know value is null | undefined here
      expect(value === null || value === undefined).toBe(true)
    } else {
      // TypeScript should know value is string here
      expect(typeof value).toBe("string")
    }
  })
})
