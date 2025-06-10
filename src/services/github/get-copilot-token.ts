import type { AccountManager } from "~/lib/account-manager"
import type { State } from "~/lib/state"

import { GITHUB_API_BASE_URL, githubHeaders } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state, accountManager } from "~/lib/state"

export interface GetCopilotTokenDependencies {
  state?: State
  accountManager?: AccountManager
  fetch?: typeof globalThis.fetch
}

export const getCopilotToken = async (
  deps: GetCopilotTokenDependencies = {},
) => {
  const currentState = deps.state ?? state
  const currentAccountManager = deps.accountManager ?? accountManager
  const fetchFn = deps.fetch ?? globalThis.fetch

  const response = await fetchFn(
    `${GITHUB_API_BASE_URL}/copilot_internal/v2/token`,
    {
      headers: githubHeaders(currentState),
    },
  )

  if (!response.ok) {
    // Handle rate limiting with account rotation
    if (response.status === 429) {
      currentAccountManager.rotateOnRateLimit(response.status)
      currentAccountManager.updateState(currentState)
    }
    throw new HTTPError("Failed to get Copilot token", response)
  }

  return (await response.json()) as GetCopilotTokenResponse
}

// Trimmed for the sake of simplicity
interface GetCopilotTokenResponse {
  expires_at: number
  refresh_in: number
  token: string
}
