import type { AdvancedCutoffQueryV1, CutoffQueryResponse } from "./types"

const DEFAULT_API_BASE_URL = ""
const DEFAULT_INTERNAL_API_BASE_URL = "http://backend:8080"

function apiBaseUrl() {
  const configuredPublic = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim()

  if (configuredPublic) return configuredPublic

  if (typeof window === "undefined") return DEFAULT_INTERNAL_API_BASE_URL
  return DEFAULT_API_BASE_URL
}

export type PostCutoffQueryResult =
  | { ok: true; data: CutoffQueryResponse }
  | { ok: false; status: number; error: string; details?: string[]; raw?: string }

function isCutoffQueryResponse(v: unknown): v is CutoffQueryResponse {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  if (o.ok !== true || !o.pools || typeof o.pools !== "object") return false
  const p = o.pools as Record<string, unknown>
  return Array.isArray(p.open) && Array.isArray(p.category) && Array.isArray(p.openPwd) && Array.isArray(p.categoryPwd)
}

/**
 * POST /api/cutoffs/query — returns typed pools on success.
 */
export async function postCutoffQuery(payload: AdvancedCutoffQueryV1): Promise<PostCutoffQueryResult> {
  const url = `${apiBaseUrl()}/api/cutoffs/query`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  })

  const bodyText = await response.text()
  let json: unknown = null
  try {
    json = JSON.parse(bodyText) as unknown
  } catch {
    json = null
  }

  if (!response.ok) {
    const errObj = json && typeof json === "object" ? (json as Record<string, unknown>) : null
    const msg = typeof errObj?.error === "string" ? errObj.error : `HTTP ${response.status}`
    const details = Array.isArray(errObj?.details)
      ? (errObj.details as unknown[]).filter((x): x is string => typeof x === "string")
      : undefined
    return { ok: false, status: response.status, error: msg, details, raw: bodyText.slice(0, 4000) }
  }

  if (!isCutoffQueryResponse(json)) {
    return {
      ok: false,
      status: response.status,
      error: "Unexpected response shape from cutoff API",
      raw: bodyText.slice(0, 4000),
    }
  }

  return { ok: true, data: json }
}
