import consola from "consola"

import type { TokenAccount } from "./token-parser"

/**
 * Log account rotation event
 */
export function logAccountRotation(
  fromAccount: string,
  toAccount: string,
  _statusCode: number,
): void {
  consola.info(
    `Rate limit hit for account '${fromAccount}', rotating to account '${toAccount}'`,
  )
}

/**
 * Log account rotation with detailed rate limit information
 */
export function logAccountRotationWithDetails(
  fromAccount: string,
  toAccount: string,
  details: {
    statusCode: number
    retryAfter?: number
    remainingRequests?: number
    resetTime?: Date
  },
): void {
  const resetTimeStr =
    details.resetTime ? details.resetTime.toISOString() : "unknown"
  consola.info(
    `Rate limit hit for account '${fromAccount}' (${details.remainingRequests || 0} requests remaining, resets at ${resetTimeStr}), rotating to account '${toAccount}'`,
  )
}

/**
 * Log when an account becomes rate limited
 */
export function logAccountRateLimited(
  account: string,
  details: { resetTime?: Date },
): void {
  const resetTimeStr =
    details.resetTime ? formatResetTime(details.resetTime) : "unknown"
  consola.warn(
    `Account '${account}' is now rate limited (resets at ${resetTimeStr})`,
  )
}

/**
 * Log when an account's rate limit is reset
 */
export function logAccountRateLimitReset(account: string): void {
  consola.success(
    `Account '${account}' rate limit has been reset and is now available`,
  )
}

/**
 * Log when all accounts are rate limited
 */
export function logAllAccountsRateLimited(accounts: Array<string>): void {
  const accountList = formatAccountList(accounts)
  consola.error(
    `All accounts are rate limited: ${accountList}. Consider reducing request frequency or adding more tokens.`,
  )
}

/**
 * Log when single account is rate limited but no rotation is possible
 */
export function logSingleAccountRateLimited(account: string): void {
  consola.warn(
    `Rate limit hit for account '${account}', but no other accounts available`,
  )
}

/**
 * Log account initialization
 */
export function logAccountInitialization(accounts: Array<TokenAccount>): void {
  if (accounts.length === 1) {
    consola.info(`Initialized with single account: ${accounts[0].label}`)
  } else {
    const labels = accounts.map((account) => account.label).join(", ")
    consola.info(
      `Initialized account rotation with ${accounts.length} accounts: ${labels}`,
    )
  }
}

/**
 * Log legacy token mode for backward compatibility
 */
export function logLegacyTokenMode(): void {
  consola.info("Using legacy single token mode (backward compatibility)")
}

/**
 * Log a request with account label
 */
export function logAccountRequest(
  account: string,
  method: string,
  path: string,
): void {
  consola.debug(`Request using account '${account}': ${method} ${path}`)
}

/**
 * Log successful request with timing
 */
export function logRequestSuccess(options: {
  account: string
  method: string
  path: string
  status: number
  duration: number
}): void {
  const { account, method, path, status, duration } = options
  consola.debug(
    `Request completed using account '${account}': ${method} ${path} -> ${status} (${duration}ms)`,
  )
}

/**
 * Log failed request with account context
 */
export function logRequestFailure(options: {
  account: string
  method: string
  path: string
  status: number
  error: string
}): void {
  const { account, method, path, status, error } = options
  consola.warn(
    `Request failed using account '${account}': ${method} ${path} -> ${status} (${error})`,
  )
}

/**
 * Log usage statistics
 */
export function logUsageStats(
  stats: Record<
    string,
    { requests: number; rateLimitHits: number; successRate?: number }
  >,
): void {
  consola.info("Account usage statistics:")
  for (const [account, stat] of Object.entries(stats)) {
    const successRate =
      stat.successRate !== undefined ?
        Math.round(stat.successRate * 100)
      : Math.round(((stat.requests - stat.rateLimitHits) / stat.requests) * 100)
        || 100
    consola.info(
      `  ${account}: ${formatRequestStats(stat.requests, stat.rateLimitHits, successRate / 100)}`,
    )
  }
}

/**
 * Log rotation status summary
 */
export function logRotationStatus(status: {
  currentAccount: string
  totalAccounts: number
  currentIndex: number
  rateLimitedAccounts: Array<string>
}): void {
  const rateLimitedList = formatAccountList(status.rateLimitedAccounts)
  consola.info(
    `Rotation status: Currently using '${status.currentAccount}' (${status.currentIndex + 1}/${status.totalAccounts}), Rate limited: ${rateLimitedList}`,
  )
}

/**
 * Log token parsing errors
 */
export function logTokenParsingError(source: string, error: string): void {
  consola.error(`Failed to parse tokens from ${source}: ${error}`)
}

/**
 * Log file reading errors
 */
export function logFileReadError(filePath: string, error: string): void {
  consola.error(`Failed to read tokens file '${filePath}': ${error}`)
}

/**
 * Log token validation warnings
 */
export function logTokenValidationWarning(
  account: string,
  warning: string,
): void {
  consola.warn(`Token validation warning for account '${account}': ${warning}`)
}

/**
 * Log initialization failures
 */
export function logInitializationError(error: string): void {
  consola.error(`Account manager initialization failed: ${error}`)
}

/**
 * Log verbose account rotation details
 */
export function logVerboseAccountRotation(
  fromAccount: string,
  toAccount: string,
  details: {
    previousRequests: number
    rateLimitWindow: string
    nextResetTime: string
    availableAccounts: Array<string>
  },
): void {
  if (consola.level >= 5) {
    // Only log in verbose mode
    consola.debug(`Verbose rotation details: ${fromAccount} -> ${toAccount}`)
    consola.debug(
      `  Previous requests: ${details.previousRequests}, Window: ${details.rateLimitWindow}, Next reset: ${details.nextResetTime}`,
    )
    consola.debug(
      `  Available accounts after rotation: ${details.availableAccounts.join(", ")}`,
    )
  }
}

/**
 * Log server startup with rotation info
 */
export function logServerStartWithRotation(
  serverUrl: string,
  accountCount: number,
): void {
  consola.box(
    `Server started at ${serverUrl}\nAccount rotation: ${accountCount} accounts configured`,
  )
}

/**
 * Log generic account actions with consistent formatting
 */
export function logAccountAction(
  level: "info" | "warn" | "error",
  account: string,
  action: string,
): void {
  const message = `${action} '${account}'`
  switch (level) {
    case "info": {
      consola.info(message)
      break
    }
    case "warn": {
      consola.warn(message)
      break
    }
    case "error": {
      consola.error(message)
      break
    }
    default: {
      consola.info(message)
      break
    }
  }
}

/**
 * Log rate limit with rotation context
 */
export function logRateLimitWithRotation(
  account: string,
  waitSeconds: number,
  _willRotate: boolean,
): void {
  consola.warn(
    `Rate limit reached for account '${account}'. Waiting ${waitSeconds} seconds before proceeding...`,
  )
}

// Formatting utilities

/**
 * Format account label consistently
 */
export function formatAccountLabel(label: string): string {
  return `'${label}'`
}

/**
 * Format reset time consistently
 */
export function formatResetTime(resetTime: Date): string {
  return resetTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * Format account lists for logging
 */
export function formatAccountList(accounts: Array<string>): string {
  if (accounts.length === 0) return "none"
  return accounts.join(", ")
}

/**
 * Format request statistics
 */
export function formatRequestStats(
  requests: number,
  rateLimitHits: number,
  successRate: number,
): string {
  const successPercent = Math.round(successRate * 100)
  return `${requests} requests, ${rateLimitHits} rate limit hits (${successPercent}% success)`
}
