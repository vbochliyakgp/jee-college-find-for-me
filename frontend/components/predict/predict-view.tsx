"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, ListFilter, Loader2, RefreshCw, Sparkles, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ExamType, Gender, GroupedCollege, IndianState } from "@/lib/predict/types"
import { ShortlistItem } from "@/components/predict/shortlist-item"
import { chanceBadge } from "@/lib/theme"
import { fetchPredictionWithMode, type PredictMode } from "@/lib/predict/api"

export interface InitialParams {
  examType: ExamType
  score: string
  gender: Gender
  homeState: IndianState | ""
  category: string
  categoryRank?: string
  /** OPEN-PwD rank used for OPEN (PwD) seat pool */
  openPwdRank?: string
  /** Category-PwD rank (e.g. OBC-PwD) used for category-PwD seat pool */
  categoryPwdRank?: string
  isPWD: boolean
}

interface TabDef {
  id: PredictMode
  label: string
  description: string
}

function categoryLabel(category: string): string {
  return category === "OBC" ? "OBC-NCL" : category
}

function buildTabs(params: InitialParams): TabDef[] {
  const { category, categoryRank, isPWD, openPwdRank, categoryPwdRank } = params
  const catLabel = categoryLabel(category)
  const tabs: TabDef[] = []

  tabs.push({
    id: "without-category",
    label: "Open",
    description: "Colleges reachable on your CRL rank alone — no category or PwD benefit applied.",
  })

  if (category !== "General" && categoryRank?.trim()) {
    tabs.push({
      id: "category-only",
      label: catLabel,
      description: `Colleges via ${catLabel} reserved seats only. Isolates what your category certificate adds over open merit.`,
    })
  }

  if (isPWD && (openPwdRank?.trim() || categoryPwdRank?.trim())) {
    tabs.push({
      id: "pwd-only",
      label: "PwD Quota",
      description: "Colleges via PwD horizontal reservation seats only — searches both OPEN (PwD) and Category (PwD) pools wherever you provided a rank.",
    })
  }

  if (tabs.length >= 2) {
    tabs.push({
      id: "combined",
      label: "Best Path",
      description: "All eligible pools searched together — your best possible seat across every pool available to you.",
    })
  }

  return tabs
}

interface PredictViewProps {
  initialParams: InitialParams
  initialColleges: GroupedCollege[]
  resolvedRank: number
}

export function PredictView({ initialParams, initialColleges, resolvedRank }: PredictViewProps) {
  const router = useRouter()

  const { score, gender, homeState, category, isPWD, examType } = initialParams

  const tabs = useMemo(() => buildTabs(initialParams), [initialParams])
  const showTabs = tabs.length >= 2

  const defaultTab: PredictMode = tabs.find((t) => t.id === "combined")?.id ?? tabs[0]?.id ?? "combined"
  const [activeMode, setActiveMode] = useState<PredictMode>(defaultTab)
  const [showInfo, setShowInfo] = useState(false)
  const [maxResults, setMaxResults] = useState<"50" | "100" | "max">("50")
  const [modeResults, setModeResults] = useState<Partial<Record<PredictMode, GroupedCollege[]>>>({
    combined: initialColleges,
  })
  const [loadingModes, setLoadingModes] = useState<Set<PredictMode>>(new Set())

  useEffect(() => {
    if (!showTabs) return
    const toFetch = tabs.filter((t) => t.id !== "combined")
    setLoadingModes(new Set(toFetch.map((t) => t.id)))
    let cancelled = false
    for (const tab of toFetch) {
      fetchPredictionWithMode(initialParams, tab.id)
        .then((resp) => {
          if (cancelled) return
          setModeResults((prev) => ({ ...prev, [tab.id]: resp.colleges }))
          setLoadingModes((prev) => { const next = new Set(prev); next.delete(tab.id); return next })
        })
        .catch(() => {
          if (cancelled) return
          setModeResults((prev) => ({ ...prev, [tab.id]: [] }))
          setLoadingModes((prev) => { const next = new Set(prev); next.delete(tab.id); return next })
        })
    }
    return () => { cancelled = true }
  }, [initialParams])

  const resetFlow = () => router.push("/")

  const isActiveLoading = loadingModes.has(activeMode)
  const filteredColleges = modeResults[activeMode] ?? []

  const baseContextParts: string[] = []
  if (gender === "female") baseContextParts.push("Female quota")
  if (homeState) baseContextParts.push(homeState)
  const baseContext = baseContextParts.join(" · ")

  const limitedColleges = useMemo(() => {
    const cap = maxResults === "max" ? Number.POSITIVE_INFINITY : Number(maxResults)
    if (!Number.isFinite(cap) || filteredColleges.length <= cap) return filteredColleges

    const withDept = filteredColleges.filter((c) => c.departments[0])
    const below = withDept
      .filter((c) => c.departments[0].closing_rank < resolvedRank)
      .sort((a, b) => b.departments[0].closing_rank - a.departments[0].closing_rank)
    const above = withDept
      .filter((c) => c.departments[0].closing_rank >= resolvedRank)
      .sort((a, b) => a.departments[0].closing_rank - b.departments[0].closing_rank)

    const target = Math.min(cap, withDept.length)
    const pick: GroupedCollege[] = []
    let i = 0
    let j = 0
    while (pick.length < target && (i < below.length || j < above.length)) {
      if (j < above.length) pick.push(above[j++])
      if (pick.length >= target) break
      if (i < below.length) pick.push(below[i++])
    }

    const selected = new Set(pick.slice(0, target))
    return withDept.filter((c) => selected.has(c))
  }, [filteredColleges, maxResults, resolvedRank])

  const hasResults = limitedColleges.length > 0

  const countByChance = useMemo(() => {
    const counts = { dream: 0, easy: 0 }
    for (const college of limitedColleges) {
      for (const dept of college.departments) {
        counts[dept.chance ?? "easy"] += 1
      }
    }
    return counts
  }, [limitedColleges])

  const descriptionText = [
    `Rank ${score}`,
    category !== "General" || isPWD ? `${category}${isPWD ? " (PwD)" : ""}` : null,
    gender === "female" ? "Female + GN quotas" : null,
    examType === "jee-main" ? (homeState ? `HS: ${homeState}` : "HS: not selected") : "IITs only",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="container max-w-[1400px] px-2 py-2 sm:px-4 md:py-8">
      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur">
        <CardHeader className="gap-2 border-b border-border/70 bg-gradient-to-r from-primary/[0.07] via-background to-background px-2.5 pb-2.5 pt-3 sm:gap-4 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary sm:gap-2 sm:px-3 sm:py-1 sm:text-[11px]">
            <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
            Prediction shortlist
          </div>

          <div>
            <CardTitle className="text-base leading-tight sm:text-2xl">Your college shortlist</CardTitle>
            <CardDescription className="mt-0.5 text-[10px] leading-snug sm:mt-1 sm:text-sm">{descriptionText}</CardDescription>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-2">
            <div className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 sm:rounded-xl sm:px-4 sm:py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">General rank used</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-primary sm:mt-1 sm:text-2xl">{resolvedRank.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 sm:rounded-xl sm:px-4 sm:py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Institutes shown</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:mt-1 sm:text-2xl">{limitedColleges.length}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 sm:rounded-xl sm:px-4 sm:py-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Best chance count</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:mt-1 sm:text-2xl">{countByChance.easy}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-2.5 py-3 sm:space-y-6 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-muted/25 p-2 sm:gap-3 sm:rounded-xl sm:p-3">

            {/* View label + info toggle */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground sm:gap-1.5 sm:text-xs">
                <ListFilter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                View
              </span>
              {showTabs && (
                <button
                  type="button"
                  onClick={() => setShowInfo((v) => !v)}
                  aria-label={showInfo ? "Hide tab info" : "Show tab info"}
                  className="inline-flex items-center rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                >
                  <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
              )}
              {baseContext && (
                <span className="ml-auto text-[10px] text-muted-foreground">{baseContext}</span>
              )}
            </div>

            {/* Tabs */}
            {showTabs && (
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:gap-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeMode === tab.id ? "default" : "outline"}
                    size="sm"
                    className="h-7 shrink-0 whitespace-nowrap px-2.5 text-[11px] sm:h-9 sm:px-3 sm:text-sm"
                    onClick={() => setActiveMode(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Info panel */}
            {showTabs && showInfo && (
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5 space-y-1.5">
                {tabs.map((tab) => (
                  <div key={tab.id} className="flex gap-2 text-[11px] sm:text-xs">
                    <span className="w-20 shrink-0 font-semibold text-foreground">{tab.label}</span>
                    <span className="text-muted-foreground">{tab.description}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <Select value={maxResults} onValueChange={(v) => setMaxResults(v as "50" | "100" | "max")}>
                <SelectTrigger className="h-8 w-full bg-background text-xs sm:h-9 sm:w-[140px] sm:text-sm">
                  <SelectValue placeholder="Max results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 (default)</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 px-2.5 text-xs sm:h-9 sm:w-auto sm:gap-2 sm:px-3 sm:text-sm" onClick={resetFlow}>
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                New search
              </Button>
            </div>
          </div>

          {isActiveLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading results…</span>
            </div>
          ) : hasResults ? (
            <>
              <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5">
                <p className="text-xs font-medium text-foreground sm:text-base">
                  Showing {limitedColleges.length} institute{limitedColleges.length === 1 ? "" : "s"}.
                </p>
                <Badge variant="secondary" className="hidden w-fit gap-1.5 sm:inline-flex">
                  <Trophy className="h-3.5 w-3.5" />
                  Ranked fit
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className={chanceBadge.low}>Dream: {countByChance.dream}</Badge>
                <Badge className={chanceBadge.high}>Easy: {countByChance.easy}</Badge>
              </div>

              {limitedColleges.map((institute) => {
                const dept = institute.departments[0]
                if (!dept) return null
                return <ShortlistItem key={`${institute.institute}-${dept.department}`} institute={institute} />
              })}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-12 text-center text-muted-foreground">
              <p>No rows matched after expanded search attempts.</p>
              <p className="mt-2 text-sm">
                Tips: verify exam type, try a nearby rank, or relax category/PwD constraints and search again.
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFlow}>
                Try again
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={resetFlow}>
            New prediction
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
