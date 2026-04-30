/**
 * Advanced cutoff query (v1) — client contract for POST /api/cutoffs/query.
 *
 * Power mode — union semantics (for the backend to implement):
 * - Each entry in `powerMode.closingRankBands` that is "active" defines a slice
 *   of rows for a logical seat pool (open / category / open_pwd / category_pwd).
 * - Active means at least one of closingRankMin / closingRankMax is non-null.
 * - Final row set is the UNION of rows matching ANY active clause (OR), after
 *   applying global filters (exam, gender, quotas, institute types, category context).
 *
 * Closing-rank band: a row matches a clause when
 *   (min == null || closing_rank >= min) && (max == null || closing_rank <= max),
 *   with min/max taken from the clause, plus the row’s seat pool matches the clause target.
 *
 * Exact seat_type strings per targetPool are resolved on the server using `category` + `isPwd`
 * and JoSAA naming (OPEN, OBC-NCL, OPEN (PwD), …).
 *
 * ---
 * Backend validation (mirror the client rules in `build-payload.ts`):
 *
 * - `examType === "jee-advanced"`: `homeState` must be absent or null; `quotas` must be only AI+OS;
 *   `instituteTypes` must be exactly IIT counseling scope (client sends `["IIT"]`).
 * - `examType === "jee-main"`: `homeState` optional; if set, quotas may include HS/GO/JK/LA per product rules;
 *   if unset, quotas AI+OS only. When set, the server applies domicile rules (ALGORITHM.md §5): HS vs institute `state`,
 *   OS for other-state institutes, GO/JK/LA only for matching home states.
 * - `powerMode.closingRankBands`: drop or reject clauses for pools that are not allowed for the given
 *   `category` / `isPwd` (see `isRankBandRowEnabled` in build-payload): `category` row only when category ≠ General;
 *   `open_pwd` only when `isPwd`; `category_pwd` only when `isPwd` and category ≠ General; `open` always allowed.
 */

export type ExamType = "jee-main" | "jee-advanced"

export type GenderPool = "neutral" | "female"

export type InstituteType = "IIT" | "NIT" | "IIIT" | "GFTI"

export type QuotaCode = "AI" | "OS" | "HS" | "GO" | "JK" | "LA"

export type RankBandTargetPool = "open" | "category" | "open_pwd" | "category_pwd"

export interface ClosingRankBandClause {
  targetPool: RankBandTargetPool
  /** Inclusive; null means no lower bound. */
  closingRankMin: number | null
  /** Inclusive; null means no upper bound. */
  closingRankMax: number | null
}

export interface AdvancedCutoffQueryV1 {
  version: 1
  counseling: "josaa" | "csab"
  examType: ExamType
  genderPool: GenderPool
  category: "General" | "OBC" | "SC" | "ST" | "EWS"
  isPwd: boolean
  /**
   * JEE Main only: domicile for expanded quotas (HS/GO/JK/LA). Omit entirely for `jee-advanced`.
   */
  homeState?: string | null
  quotas: QuotaCode[]
  instituteTypes: InstituteType[]
  powerMode: {
    combine: "union"
    closingRankBands: ClosingRankBandClause[]
  }
  pagination?: {
    targetPool: RankBandTargetPool
    page: number
    pageSize: number
  }
}

export type CategoryOption = AdvancedCutoffQueryV1["category"]

/** Row returned from POST /api/cutoffs/query pools.* */
export interface CutoffResultRow {
  exam_type: string
  institute: string
  department: string
  institute_type: string
  state: string
  NIRF?: string | null
  quota: string
  gender: string
  seat_type: string
  opening_rank: number
  closing_rank: number
}

/** Successful API body from POST /api/cutoffs/query */
export interface CutoffQueryResponse {
  ok: true
  pools: {
    open: CutoffResultRow[]
    category: CutoffResultRow[]
    openPwd: CutoffResultRow[]
    categoryPwd: CutoffResultRow[]
  }
  meta?: {
    open: { returnedRows: number; truncated: boolean; hasMore: boolean; page: number; pageSize: number }
    category: { returnedRows: number; truncated: boolean; hasMore: boolean; page: number; pageSize: number }
    openPwd: { returnedRows: number; truncated: boolean; hasMore: boolean; page: number; pageSize: number }
    categoryPwd: { returnedRows: number; truncated: boolean; hasMore: boolean; page: number; pageSize: number }
  }
}
