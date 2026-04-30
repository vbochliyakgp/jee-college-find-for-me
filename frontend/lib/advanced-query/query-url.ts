import type { AdvancedCutoffQueryV1 } from "./types"

function utf8ToBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  const b64 = btoa(binary)
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
  const binary = atob(b64 + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

const examTypes = new Set(["jee-main", "jee-advanced"])
const counselingTypes = new Set(["josaa", "csab"])
const genderPools = new Set(["neutral", "female"])
const categories = new Set(["General", "OBC", "SC", "ST", "EWS"])
const quotas = new Set(["AI", "OS", "HS", "GO", "JK", "LA"])
const instituteTypes = new Set(["IIT", "NIT", "IIIT", "GFTI"])
const targetPools = new Set(["open", "category", "open_pwd", "category_pwd"])

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}

/** Minimal structural check after JSON parse (not full backend validation). */
function looksLikeAdvancedCutoffQueryV1(x: unknown): boolean {
  if (!isRecord(x)) return false
  if (x.version !== 1) return false
  if (x.counseling !== undefined && (typeof x.counseling !== "string" || !counselingTypes.has(x.counseling))) {
    return false
  }
  if (typeof x.examType !== "string" || !examTypes.has(x.examType)) return false
  if (typeof x.genderPool !== "string" || !genderPools.has(x.genderPool)) return false
  if (typeof x.category !== "string" || !categories.has(x.category)) return false
  if (typeof x.isPwd !== "boolean") return false
  if (x.homeState !== undefined && x.homeState !== null && typeof x.homeState !== "string") return false
  if (!Array.isArray(x.quotas) || !x.quotas.every((q) => typeof q === "string" && quotas.has(q))) return false
  if (!Array.isArray(x.instituteTypes) || !x.instituteTypes.every((t) => typeof t === "string" && instituteTypes.has(t))) {
    return false
  }
  const pm = x.powerMode
  if (!isRecord(pm) || pm.combine !== "union") return false
  const bands = pm.closingRankBands
  if (!Array.isArray(bands)) return false
  for (const b of bands) {
    if (!isRecord(b)) return false
    if (typeof b.targetPool !== "string" || !targetPools.has(b.targetPool)) return false
    const hasMin = b.closingRankMin !== null && b.closingRankMin !== undefined
    const hasMax = b.closingRankMax !== null && b.closingRankMax !== undefined
    if (hasMin && typeof b.closingRankMin !== "number") return false
    if (hasMax && typeof b.closingRankMax !== "number") return false
    if (!hasMin && !hasMax) return false
  }
  return true
}

/** Base64url(JSON) for the `q` search param on `/results`. */
export function encodeCutoffQueryForUrl(payload: AdvancedCutoffQueryV1): string {
  return utf8ToBase64Url(JSON.stringify(payload))
}

export function decodeCutoffQueryFromUrl(encoded: string): AdvancedCutoffQueryV1 | null {
  const trimmed = encoded.trim()
  if (!trimmed) return null
  let json: unknown
  try {
    json = JSON.parse(base64UrlToUtf8(trimmed)) as unknown
  } catch {
    return null
  }
  if (!looksLikeAdvancedCutoffQueryV1(json)) return null

  const payload = json as any
  if (!payload.counseling) {
    payload.counseling = "josaa"
  }
  return payload as AdvancedCutoffQueryV1
}
