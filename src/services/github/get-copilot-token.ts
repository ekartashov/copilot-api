import { GITHUB_API_BASE_URL, githubHeaders } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state, accountManager } from "~/lib/state"

export const getCopilotToken = async () => {
  const response = await fetch(
    `${GITHUB_API_BASE_URL}/copilot_internal/v2/token`,
    {
      headers: githubHeaders(state),
    },
  )

  if (!response.ok) {
    // Handle rate limiting with account rotation
    if (response.status === 429) {
      accountManager.rotateOnRateLimit(response.status)
      accountManager.updateState(state)
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
