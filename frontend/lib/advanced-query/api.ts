import type { AdvancedCutoffQueryV1 } from "./types"

const DEFAULT_API_BASE_URL = ""
const DEFAULT_INTERNAL_API_BASE_URL = "http://backend:8080"

function apiBaseUrl() {
  const configuredPublic = process.env.NEXT_PUBLIC_GO_PREDICTOR_API_BASE_URL
  const configuredServer = process.env.GO_PREDICTOR_API_BASE_URL

  if (configuredPublic) return configuredPublic
  if (configuredServer) return configuredServer

  if (typeof window === "undefined") return DEFAULT_INTERNAL_API_BASE_URL
  return DEFAULT_API_BASE_URL
}

export interface AdvancedQueryApiResult {
  ok: boolean
  status: number
  bodyText: string
  json: unknown | null
}

/**
 * POST the advanced cutoff query to the Go service (endpoint to be implemented server-side).
 */
export async function postAdvancedCutoffQuery(payload: AdvancedCutoffQueryV1): Promise<AdvancedQueryApiResult> {
  const url = `${apiBaseUrl()}/api/cutoffs/query`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })

  const bodyText = await response.text()
  let json: unknown | null = null
  try {
    json = JSON.parse(bodyText) as unknown
  } catch {
    json = null
  }

  return {
    ok: response.ok,
    status: response.status,
    bodyText,
    json,
  }
}
