import type { State } from "~/lib/state"

import { GITHUB_API_BASE_URL, standardHeaders } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state } from "~/lib/state"

export interface GetGitHubUserDependencies {
  state?: State
  fetch?: typeof globalThis.fetch
}

export async function getGitHubUser(deps: GetGitHubUserDependencies = {}) {
  const currentState = deps.state ?? state
  const fetchFn = deps.fetch ?? globalThis.fetch

  const response = await fetchFn(`${GITHUB_API_BASE_URL}/user`, {
    headers: {
      authorization: `token ${currentState.githubToken}`,
      ...standardHeaders(),
    },
  })

  if (!response.ok) throw new HTTPError("Failed to get GitHub user", response)

  return (await response.json()) as GithubUserResponse
}

// Trimmed for the sake of simplicity
interface GithubUserResponse {
  login: string
}
