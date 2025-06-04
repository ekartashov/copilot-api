// Test setup file for Bun testing

// Type augmentation for global test utilities
declare global {
  var __originalConsole: any
  var NODE_ENV: string
}

// Global test setup
;(globalThis as any).NODE_ENV = "test"

// Mock console methods to reduce noise during tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
}

// Store original for restoration if needed
;(globalThis as any).__originalConsole = originalConsole

// Reduce console output during tests unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  console.log = () => {}
  console.info = () => {}
  console.warn = () => {}
  // Keep errors visible for debugging
}

// Cleanup function to restore console
export const restoreConsole = () => {
  const originalConsole = (globalThis as any).__originalConsole
  if (originalConsole) {
    console.log = originalConsole.log
    console.error = originalConsole.error
    console.warn = originalConsole.warn
    console.info = originalConsole.info
  }
}

// Common test utilities
export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export const createMockRequest = (
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) => {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// Mock GitHub API responses
export const mockGitHubUser = {
  login: "test-user",
  id: 12345,
  node_id: "MDQ6VXNlcjEyMzQ1",
  avatar_url: "https://avatars.githubusercontent.com/u/12345?v=4",
  name: "Test User",
  email: "test@example.com",
}

export const mockDeviceCodeResponse = {
  device_code: "test-device-code",
  user_code: "TEST-1234",
  verification_uri: "https://github.com/login/device",
  expires_in: 900,
  interval: 5,
}

export const mockCopilotTokenResponse = {
  token: "test-copilot-token",
  expires_at: new Date(Date.now() + 3600000).getTime(),
  refresh_in: 3600,
}

export const mockModelsResponse = {
  models: [
    {
      id: "gpt-4",
      object: "model",
      created: 1686935002,
      owned_by: "github",
    },
    {
      id: "gpt-3.5-turbo",
      object: "model", 
      created: 1686935002,
      owned_by: "github",
    },
  ],
}