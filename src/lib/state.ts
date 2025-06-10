import type { ModelsResponse } from "~/services/copilot/get-models"

import { AccountManager } from "./account-manager"

export interface State {
  githubToken?: string
  copilotToken?: string

  accountType: string
  models?: ModelsResponse
  vsCodeVersion?: string

  manualApprove: boolean
  rateLimitWait: boolean
  visionEnabled: boolean

  // Rate limiting configuration
  rateLimitSeconds?: number
  lastRequestTimestamp?: number
}

export const state: State = {
  accountType: "individual",
  manualApprove: false,
  rateLimitWait: false,
  visionEnabled: false,
}

// Global account manager instance
export const accountManager = new AccountManager()
