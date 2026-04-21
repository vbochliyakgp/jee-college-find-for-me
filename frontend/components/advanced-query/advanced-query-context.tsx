"use client"

import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"
import type { IndianState } from "@/lib/geo/indian-states"
import { postCutoffQuery } from "@/lib/advanced-query/api"
import {
  bandFieldErrors,
  buildAdvancedCutoffQueryV1,
  isRankBandRowEnabled,
  type BandFields,
} from "@/lib/advanced-query/build-payload"
import type { AdvancedCutoffQueryV1, CategoryOption, CutoffQueryResponse, ExamType, GenderPool, InstituteType } from "@/lib/advanced-query/types"

const DEFAULT_QUOTAS_LABEL = ["AI", "OS"].join(", ")
const EXPANDED_QUOTAS_LABEL = ["AI", "OS", "HS", "GO", "JK", "LA"].join(", ")

export const ADVANCED_QUERY_CATEGORIES: CategoryOption[] = ["General", "OBC", "SC", "ST", "EWS"]
export const ADVANCED_QUERY_INSTITUTE_TYPES: InstituteType[] = ["IIT", "NIT", "IIIT", "GFTI"]

function emptyBands(): BandFields {
  return {
    open: { min: "", max: "" },
    category: { min: "", max: "" },
    openPwd: { min: "", max: "" },
    categoryPwd: { min: "", max: "" },
  }
}

export interface AdvancedQueryRequestState {
  lastSuccessResponse: CutoffQueryResponse | null
  lastErrorDetails: string[] | null
  clientError: string | null
  isPending: boolean
}

export interface AdvancedQueryDerived {
  bandErrors: Partial<Record<keyof BandFields, string>>
  hasBandErrors: boolean
  activeBandCount: number
  quotasPreview: string
  instituteTypesList: InstituteType[]
  bandKeyEnabled: Record<keyof BandFields, boolean>
}

export type SubmitQueryOptions = {
  onSuccess?: () => void
}

export interface AdvancedQueryContextValue extends AdvancedQueryRequestState, AdvancedQueryDerived {
  examType: ExamType
  setExamType: (v: ExamType) => void
  genderPool: GenderPool
  setGenderPool: (v: GenderPool) => void
  category: CategoryOption
  setCategory: (v: CategoryOption) => void
  isPwd: boolean
  setIsPwd: (v: boolean) => void
  homeState: IndianState | ""
  setHomeState: (v: IndianState | "") => void
  instituteSelected: Record<InstituteType, boolean>
  toggleInstitute: (t: InstituteType, checked: boolean) => void
  bands: BandFields
  setBandEdge: (key: keyof BandFields, edge: "min" | "max", value: string) => void
  resetBands: () => void
  clearResults: () => void
  submitQuery: (e: React.FormEvent, opts?: SubmitQueryOptions) => void
}

const AdvancedQueryContext = createContext<AdvancedQueryContextValue | null>(null)

export function AdvancedQueryProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition()

  const [examType, setExamType] = useState<ExamType>("jee-main")
  const [genderPool, setGenderPool] = useState<GenderPool>("neutral")
  const [category, setCategory] = useState<CategoryOption>("General")
  const [isPwd, setIsPwd] = useState(false)
  const [homeState, setHomeState] = useState<IndianState | "">("")

  const [instituteSelected, setInstituteSelected] = useState<Record<InstituteType, boolean>>({
    IIT: true,
    NIT: true,
    IIIT: true,
    GFTI: true,
  })

  const [bands, setBands] = useState<BandFields>(emptyBands)

  const [lastSuccessResponse, setLastSuccessResponse] = useState<CutoffQueryResponse | null>(null)
  const [lastErrorDetails, setLastErrorDetails] = useState<string[] | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    if (examType === "jee-advanced") {
      setInstituteSelected({ IIT: true, NIT: false, IIIT: false, GFTI: false })
      setHomeState("")
    } else {
      setInstituteSelected({ IIT: true, NIT: true, IIIT: true, GFTI: true })
    }
  }, [examType])

  useEffect(() => {
    setBands((prev) => {
      const next = { ...prev }
      let changed = false
      const clear = (k: keyof BandFields) => {
        if (prev[k].min.trim() || prev[k].max.trim()) {
          next[k] = { min: "", max: "" }
          changed = true
        }
      }
      if (!isRankBandRowEnabled("category", category, isPwd)) clear("category")
      if (!isRankBandRowEnabled("openPwd", category, isPwd)) clear("openPwd")
      if (!isRankBandRowEnabled("categoryPwd", category, isPwd)) clear("categoryPwd")
      return changed ? next : prev
    })
  }, [category, isPwd])

  const bandKeyEnabled = useMemo(
    (): Record<keyof BandFields, boolean> => ({
      open: isRankBandRowEnabled("open", category, isPwd),
      category: isRankBandRowEnabled("category", category, isPwd),
      openPwd: isRankBandRowEnabled("openPwd", category, isPwd),
      categoryPwd: isRankBandRowEnabled("categoryPwd", category, isPwd),
    }),
    [category, isPwd],
  )

  const bandErrors = useMemo(() => bandFieldErrors(bands, category, isPwd), [bands, category, isPwd])
  const hasBandErrors = Object.keys(bandErrors).length > 0

  const activeBandCount = useMemo(() => {
    const keys: (keyof BandFields)[] = ["open", "category", "openPwd", "categoryPwd"]
    let n = 0
    for (const k of keys) {
      if (!bandKeyEnabled[k]) continue
      if (bands[k].min.trim() || bands[k].max.trim()) n++
    }
    return n
  }, [bands, bandKeyEnabled])

  const quotasPreview = useMemo(() => {
    if (examType === "jee-advanced") return DEFAULT_QUOTAS_LABEL
    return homeState.trim() ? EXPANDED_QUOTAS_LABEL : DEFAULT_QUOTAS_LABEL
  }, [examType, homeState])

  const instituteTypesList = useMemo(
    () => ADVANCED_QUERY_INSTITUTE_TYPES.filter((t) => instituteSelected[t]),
    [instituteSelected],
  )

  const toggleInstitute = useCallback((t: InstituteType, checked: boolean) => {
    if (examType === "jee-advanced") return
    setInstituteSelected((prev) => ({ ...prev, [t]: checked }))
  }, [examType])

  const setBandEdge = useCallback((key: keyof BandFields, edge: "min" | "max", value: string) => {
    if (!isRankBandRowEnabled(key, category, isPwd)) return
    setBands((prev) => ({ ...prev, [key]: { ...prev[key], [edge]: value } }))
  }, [category, isPwd])

  const resetBands = useCallback(() => {
    setBands(emptyBands())
  }, [])

  const clearResults = useCallback(() => {
    setLastSuccessResponse(null)
    setLastErrorDetails(null)
  }, [])

  const submitQuery = useCallback(
    (e: React.FormEvent, opts?: SubmitQueryOptions) => {
      e.preventDefault()
      setClientError(null)
      setLastErrorDetails(null)

      if (hasBandErrors) {
        setClientError("Fix closing rank band errors before sending.")
        return
      }
      if (instituteTypesList.length === 0) {
        setClientError("Select at least one institute type.")
        return
      }

      const payload = buildAdvancedCutoffQueryV1({
        examType,
        genderPool,
        category,
        isPwd,
        homeState,
        instituteTypes: instituteTypesList,
        bandFields: bands,
      })

      startTransition(async () => {
        try {
          const res = await postCutoffQuery(payload)
          if (res.ok) {
            setLastSuccessResponse(res.data)
            setLastErrorDetails(null)
            opts?.onSuccess?.()
            return
          }
          setLastErrorDetails(res.details ?? null)
          setClientError(res.error)
        } catch (err) {
          const message = err instanceof Error ? err.message : "Network error"
          setClientError(message)
        }
      })
    },
    [bands, category, examType, genderPool, hasBandErrors, homeState, instituteTypesList, isPwd],
  )

  const value = useMemo<AdvancedQueryContextValue>(
    () => ({
      examType,
      setExamType,
      genderPool,
      setGenderPool,
      category,
      setCategory,
      isPwd,
      setIsPwd,
      homeState,
      setHomeState,
      instituteSelected,
      toggleInstitute,
      bands,
      setBandEdge,
      resetBands,
      clearResults,
      submitQuery,
      lastSuccessResponse,
      lastErrorDetails,
      clientError,
      isPending,
      bandErrors,
      hasBandErrors,
      activeBandCount,
      quotasPreview,
      instituteTypesList,
      bandKeyEnabled,
    }),
    [
      activeBandCount,
      bandErrors,
      bandKeyEnabled,
      bands,
      category,
      clearResults,
      clientError,
      examType,
      genderPool,
      hasBandErrors,
      homeState,
      instituteSelected,
      isPending,
      isPwd,
      instituteTypesList,
      lastErrorDetails,
      lastSuccessResponse,
      quotasPreview,
      resetBands,
      setBandEdge,
      submitQuery,
      toggleInstitute,
    ],
  )

  return <AdvancedQueryContext.Provider value={value}>{children}</AdvancedQueryContext.Provider>
}

export function useAdvancedQuery(): AdvancedQueryContextValue {
  const ctx = useContext(AdvancedQueryContext)
  if (!ctx) {
    throw new Error("useAdvancedQuery must be used within AdvancedQueryProvider")
  }
  return ctx
}
