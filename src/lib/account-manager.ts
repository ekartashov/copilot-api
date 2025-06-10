import consola from "consola"

import type { State } from "./state"

import { getAllTokens, type TokenAccount } from "./token-parser"

export class AccountManager {
  private accounts: Array<TokenAccount> = []
  private currentIndex: number = 0
  private rateLimitedAccounts: Set<string> = new Set()
  private usageStats: Record<
    string,
    { requests: number; rateLimitHits: number }
  > = {}

  /**
   * Initialize the account manager with available tokens
   */
  async initialize(): Promise<void> {
    try {
      this.accounts = await getAllTokens()

      if (this.accounts.length === 0) {
        throw new Error("No GitHub tokens available")
      }

      // Initialize usage stats
      for (const account of this.accounts) {
        this.usageStats[account.label] = { requests: 0, rateLimitHits: 0 }
      }

      // Log initialization
      const labels = this.accounts.map((account) => account.label).join(", ")
      consola.info(
        `Initialized account rotation with ${this.accounts.length} accounts: ${labels}`,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to initialize account manager: ${message}`)
    }
  }

  /**
   * Rotate to next account on rate limit (HTTP 429 only)
   */
  rotateOnRateLimit(statusCode: number): boolean {
    // Only rotate on 429 rate limit
    if (statusCode !== 429) {
      return false
    }

    const currentAccount = this.getCurrentAccount()

    // Handle single account case
    if (this.accounts.length === 1) {
      consola.warn(
        `Rate limit hit for account '${currentAccount.label}', but no other accounts available`,
      )
      return false
    }

    // Record rate limit hit
    this.usageStats[currentAccount.label].rateLimitHits++

    // Find next available account
    const originalIndex = this.currentIndex
    do {
      this.currentIndex = (this.currentIndex + 1) % this.accounts.length
      const nextAccount = this.getCurrentAccount()

      if (!this.rateLimitedAccounts.has(nextAccount.label)) {
        consola.info(
          `Rate limit hit for account '${currentAccount.label}', rotating to account '${nextAccount.label}'`,
        )
        return true
      }
    } while (this.currentIndex !== originalIndex)

    // All accounts are rate limited
    const _allLabels = this.accounts.map((a) => a.label)
    consola.error(
      "All accounts are rate limited. Consider reducing request frequency or adding more tokens.",
    )
    return false
  }

  /**
   * Update state with current account token
   */
  updateState(state: State): void {
    const currentAccount = this.getCurrentAccount()
    state.githubToken = currentAccount.token
  }

  /**
   * Get current active account
   */
  getCurrentAccount(): TokenAccount {
    return this.accounts[this.currentIndex]
  }

  /**
   * Get total number of accounts
   */
  getAccountCount(): number {
    return this.accounts.length
  }

  /**
   * Mark an account as rate limited
   */
  markAccountRateLimited(label: string): void {
    this.rateLimitedAccounts.add(label)
  }

  /**
   * Reset rate limit status for an account
   */
  resetRateLimitStatus(label: string): void {
    this.rateLimitedAccounts.delete(label)
  }

  /**
   * Check if an account is rate limited
   */
  isAccountRateLimited(label: string): boolean {
    return this.rateLimitedAccounts.has(label)
  }

  /**
   * Check if all accounts are rate limited
   */
  areAllAccountsRateLimited(): boolean {
    const allRateLimited = this.accounts.every((account) =>
      this.rateLimitedAccounts.has(account.label),
    )

    if (allRateLimited && this.accounts.length > 1) {
      consola.error(
        "All accounts are rate limited. Consider reducing request frequency or adding more tokens.",
      )
    }

    return allRateLimited
  }

  /**
   * Record a request for an account
   */
  recordRequest(label: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.usageStats[label]) {
      this.usageStats[label].requests++
    }
  }

  /**
   * Get usage statistics for all accounts
   */
  getUsageStats(): Record<string, { requests: number; rateLimitHits: number }> {
    return { ...this.usageStats }
  }

  /**
   * Get current rotation status
   */
  getRotationStatus(): {
    currentAccount: string
    totalAccounts: number
    currentIndex: number
    rateLimitedAccounts: Array<string>
  } {
    return {
      currentAccount: this.getCurrentAccount().label,
      totalAccounts: this.accounts.length,
      currentIndex: this.currentIndex,
      rateLimitedAccounts: Array.from(this.rateLimitedAccounts),
    }
  }
}
