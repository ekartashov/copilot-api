import { readFile } from "node:fs/promises"

export interface TokenAccount {
  label: string
  token: string
}

/**
 * Parse comma-separated tokens from environment variable
 * Format: "label1:token1,label2:token2,token3" (unlabeled tokens get auto-generated labels)
 */
export function parseTokensFromEnv(): Array<TokenAccount> {
  const envValue = process.env.GH_TOKENS
  if (!envValue) {
    return []
  }

  try {
    return parseTokensFromString(envValue, ",")
  } catch {
    // Gracefully handle malformed tokens by returning empty array
    return []
  }
}

/**
 * Parse newline-delimited tokens from file content
 * Format: "label1:token1\nlabel2:token2\ntoken3" (unlabeled tokens get auto-generated labels)
 */
export function parseTokensFromFile(content: string): Array<TokenAccount> {
  return parseTokensFromString(content, /\r?\n/)
}

/**
 * Load tokens from file specified in GH_TOKENS_FILE environment variable
 */
export async function loadTokensFromFile(): Promise<Array<TokenAccount>> {
  const filePath = process.env.GH_TOKENS_FILE
  if (!filePath) {
    return []
  }

  try {
    // Use mock if available (for testing)
    const content: string = await (__mockReadFile._mockValue
      || readFile(filePath, "utf8"))
    return parseTokensFromFile(content)
  } catch {
    // Gracefully handle file read errors by returning empty array
    return []
  }
}

/**
 * Get all tokens from environment, file, or fallback to single token
 * Priority: GH_TOKENS > GH_TOKENS_FILE > GH_TOKEN
 */
export async function getAllTokens(): Promise<Array<TokenAccount>> {
  // First try environment variable
  const envTokens = parseTokensFromEnv()
  if (envTokens.length > 0) {
    return envTokens
  }

  // Then try file
  const fileTokens = await loadTokensFromFile()
  if (fileTokens.length > 0) {
    return fileTokens
  }

  // Finally fall back to single GH_TOKEN
  const singleToken = process.env.GH_TOKEN
  if (singleToken) {
    return [{ label: "account-1", token: singleToken }]
  }

  // No tokens found
  return []
}

/**
 * Validate token format
 */
export function validateToken(token: string): void {
  // Check for invalid format (multiple colons) first
  const colonCount = (token.match(/:/g) || []).length
  if (colonCount > 1) {
    throw new Error("Invalid token format")
  }

  if (!token || token.trim() === "") {
    throw new Error("Token cannot be empty")
  }
}

/**
 * Parse tokens from a string with given delimiter
 */
function parseTokensFromString(
  value: string,
  delimiter: string | RegExp,
): Array<TokenAccount> {
  const tokens: Array<TokenAccount> = []
  const parts = value
    .split(delimiter)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  let accountCounter = 1

  for (const part of parts) {
    // Check for invalid token format first (multiple colons)
    const colonCount = (part.match(/:/g) || []).length
    if (colonCount > 1) {
      throw new Error("Invalid token format")
    }

    if (part.includes(":")) {
      const [label, token] = part.split(":", 2)
      if (!token || token.trim() === "" || !label || label.trim() === "") {
        throw new Error("Invalid token format")
      }
      validateToken(token)
      tokens.push({ label: label.trim(), token: token.trim() })
    } else {
      // Unlabeled token - generate auto label
      validateToken(part)
      tokens.push({ label: `account-${accountCounter}`, token: part })
    }
    accountCounter++
  }

  return tokens
}

// Mock for testing
export const __mockReadFile = {
  mockResolvedValue: (value: string) => {
    __mockReadFile._mockValue = Promise.resolve(value)
  },
  mockRejectedValue: (error: Error) => {
    __mockReadFile._mockValue = Promise.reject(error)
  },
  mockClear: () => {
    __mockReadFile._mockValue = null
  },
  _mockValue: null as Promise<string> | null,
}
