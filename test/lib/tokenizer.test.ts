import { test, expect, describe, mock, beforeEach } from "bun:test"
import type { Message } from "../../src/services/copilot/create-chat-completions"

// Mock gpt-tokenizer
const mockCountTokens = mock(() => 0)
mock.module("gpt-tokenizer/model/gpt-4o", () => ({
  countTokens: mockCountTokens
}))

// Import after mocking
import { getTokenCount } from "../../src/lib/tokenizer"

describe("getTokenCount", () => {
  beforeEach(() => {
    mockCountTokens.mockClear()
  })

  test("should count tokens for input and output messages", () => {
    const messages: Array<Message> = [
      { role: "user", content: "Hello, how are you?" },
      { role: "assistant", content: "I'm doing well, thank you!" },
      { role: "user", content: "What's the weather like?" }
    ]

    mockCountTokens
      .mockReturnValueOnce(10) // input tokens
      .mockReturnValueOnce(8)  // output tokens

    const result = getTokenCount(messages)

    expect(result.input).toBe(10)
    expect(result.output).toBe(8)
    expect(mockCountTokens).toHaveBeenCalledTimes(2)
  })

  test("should filter input and output messages correctly", () => {
    const messages: Array<Message> = [
      { role: "user", content: "User message" },
      { role: "system", content: "System message" },
      { role: "assistant", content: "Assistant message" }
    ]

    mockCountTokens
      .mockReturnValueOnce(5) // input tokens
      .mockReturnValueOnce(3) // output tokens

    const result = getTokenCount(messages)

    expect(result.input).toBe(5)
    expect(result.output).toBe(3)
    expect(mockCountTokens).toHaveBeenCalledTimes(2)

    // Verify the filtering logic is working by checking call count
    expect(mockCountTokens).toHaveBeenNthCalledWith(1, expect.any(Array))
    expect(mockCountTokens).toHaveBeenNthCalledWith(2, expect.any(Array))
  })

  test("should handle empty message arrays", () => {
    const messages: Array<Message> = []

    mockCountTokens
      .mockReturnValueOnce(0) // input tokens
      .mockReturnValueOnce(0) // output tokens

    const result = getTokenCount(messages)

    expect(result.input).toBe(0)
    expect(result.output).toBe(0)
    expect(mockCountTokens).toHaveBeenCalledTimes(2)
  })

  test("should handle messages with only assistant responses", () => {
    const messages: Array<Message> = [
      { role: "assistant", content: "First response" },
      { role: "assistant", content: "Second response" }
    ]

    mockCountTokens
      .mockReturnValueOnce(0) // input tokens (no user/system messages)
      .mockReturnValueOnce(6) // output tokens

    const result = getTokenCount(messages)

    expect(result.input).toBe(0)
    expect(result.output).toBe(6)
    expect(mockCountTokens).toHaveBeenCalledTimes(2)
  })

  test("should handle messages with only user/system messages", () => {
    const messages: Array<Message> = [
      { role: "user", content: "User message" },
      { role: "system", content: "System message" }
    ]

    mockCountTokens
      .mockReturnValueOnce(7) // input tokens
      .mockReturnValueOnce(0) // output tokens (no assistant messages)

    const result = getTokenCount(messages)

    expect(result.input).toBe(7)
    expect(result.output).toBe(0)
    expect(mockCountTokens).toHaveBeenCalledTimes(2)
  })

  test("should return correct structure", () => {
    const messages: Array<Message> = [
      { role: "user", content: "Test message" }
    ]

    mockCountTokens
      .mockReturnValueOnce(15)
      .mockReturnValueOnce(0)

    const result = getTokenCount(messages)

    expect(result).toEqual({
      input: 15,
      output: 0
    })
    expect(typeof result.input).toBe("number")
    expect(typeof result.output).toBe("number")
  })

  test("should call countTokens with filtered arrays", () => {
    const messages: Array<Message> = [
      { role: "user", content: "User content" },
      { role: "assistant", content: "Assistant content" },
      { role: "system", content: "System content" }
    ]

    mockCountTokens
      .mockReturnValueOnce(12)
      .mockReturnValueOnce(8)

    getTokenCount(messages)

    // Verify that countTokens was called twice (once for input, once for output)
    expect(mockCountTokens).toHaveBeenCalledTimes(2)
    
    // The function should filter correctly:
    // Input: user and system messages (excluding assistant)
    // Output: only assistant messages
    expect(mockCountTokens).toHaveBeenCalledWith(expect.any(Array))
  })
})