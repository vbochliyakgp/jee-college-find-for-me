import type {
  AdvancedCutoffQueryV1,
  CategoryOption,
  ClosingRankBandClause,
  ExamType,
  GenderPool,
  InstituteType,
  QuotaCode,
  RankBandTargetPool,
} from "./types"

const DEFAULT_QUOTAS_AI_OS: QuotaCode[] = ["AI", "OS"]
const EXPANDED_QUOTAS: QuotaCode[] = ["AI", "OS", "HS", "GO", "JK", "LA"]

function parseBandEdge(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n < 1) return null
  return n
}

function normalizeBand(minRaw: string, maxRaw: string): { min: number | null; max: number | null } | null {
  const min = parseBandEdge(minRaw)
  const max = parseBandEdge(maxRaw)
  if (min === null && max === null) return null
  if (min !== null && max !== null && min > max) return null
  return { min, max }
}

export interface BandFields {
  open: { min: string; max: string }
  category: { min: string; max: string }
  openPwd: { min: string; max: string }
  categoryPwd: { min: string; max: string }
}

const BAND_FIELD_TO_TARGET: Record<keyof BandFields, RankBandTargetPool> = {
  open: "open",
  category: "category",
  openPwd: "open_pwd",
  categoryPwd: "category_pwd",
}

/**
 * Which closing-rank rows the user may edit for the current category / PwD flags.
 * Backend should ignore clauses for pools that are not enabled for the request.
 */
export function isRankBandRowEnabled(
  key: keyof BandFields,
  category: CategoryOption,
  isPwd: boolean,
): boolean {
  switch (key) {
    case "open":
      return true
    case "category":
      return category !== "General"
    case "openPwd":
      return isPwd
    case "categoryPwd":
      return isPwd && category !== "General"
    default:
      return false
  }
}

export function buildClosingRankBands(
  fields: BandFields,
  category: CategoryOption,
  isPwd: boolean,
): ClosingRankBandClause[] {
  const keys: (keyof BandFields)[] = ["open", "category", "openPwd", "categoryPwd"]
  const out: ClosingRankBandClause[] = []
  for (const key of keys) {
    if (!isRankBandRowEnabled(key, category, isPwd)) continue
    const { min, max } = fields[key]
    const b = normalizeBand(min, max)
    if (!b) continue
    out.push({
      targetPool: BAND_FIELD_TO_TARGET[key],
      closingRankMin: b.min,
      closingRankMax: b.max,
    })
  }
  return out
}

export function bandFieldErrors(
  fields: BandFields,
  category: CategoryOption,
  isPwd: boolean,
): Partial<Record<keyof BandFields, string>> {
  const err: Partial<Record<keyof BandFields, string>> = {}
  const keys: (keyof BandFields)[] = ["open", "category", "openPwd", "categoryPwd"]
  for (const k of keys) {
    if (!isRankBandRowEnabled(k, category, isPwd)) continue
    const b = normalizeBand(fields[k].min, fields[k].max)
    const hasAny = fields[k].min.trim() || fields[k].max.trim()
    if (hasAny && !b) err[k] = "Enter valid positive integers; min must be ≤ max."
  }
  return err
}

export interface BuildPayloadInput {
  counseling: "josaa" | "csab"
  examType: ExamType
  genderPool: GenderPool
  category: CategoryOption
  isPwd: boolean
  homeState: string | null | undefined
  instituteTypes: InstituteType[]
  bandFields: BandFields
}

export function buildAdvancedCutoffQueryV1(input: BuildPayloadInput): AdvancedCutoffQueryV1 {
  const isAdvanced = input.examType === "jee-advanced"
  const home =
    isAdvanced ? null : input.homeState?.trim()
      ? input.homeState.trim()
      : null

  const quotas: QuotaCode[] = isAdvanced ? DEFAULT_QUOTAS_AI_OS : home ? EXPANDED_QUOTAS : DEFAULT_QUOTAS_AI_OS

  const bands = buildClosingRankBands(input.bandFields, input.category, input.isPwd)

  const core = {
    version: 1 as const,
    counseling: input.counseling,
    examType: input.examType,
    genderPool: input.genderPool,
    category: input.category,
    isPwd: input.isPwd,
    quotas,
    instituteTypes: [...input.instituteTypes],
    powerMode: {
      combine: "union" as const,
      closingRankBands: bands,
    },
  }

  if (isAdvanced) {
    return core
  }

  return {
    ...core,
    homeState: home,
  }
}
