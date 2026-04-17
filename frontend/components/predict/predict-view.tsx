"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ListFilter, RefreshCw, Sparkles, Trophy } from "lucide-react"
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
  /** PwD rank: OPEN-PwD (General) or category PwD rank (reserved); required when isPWD */
  pwdRank?: string
  isPWD: boolean
}

interface PredictViewProps {
  initialParams: InitialParams
  initialColleges: GroupedCollege[]
  resolvedRank: number
}

export function PredictView({ initialParams, initialColleges, resolvedRank }: PredictViewProps) {
  const router = useRouter()

  // Read-only display values derived from initialParams
  const { score, gender, homeState, category, isPWD, examType } = initialParams

  const [activeMode, setActiveMode] = useState<PredictMode>("combined")
  const [maxResults, setMaxResults] = useState<"50" | "100" | "max">("50")
  const [modeResults, setModeResults] = useState<Record<PredictMode, GroupedCollege[]>>({
    combined: initialColleges,
    "without-category": [],
    "category-only": [],
  })

  const showCategoryTabs = category !== "General" && Boolean(initialParams.categoryRank?.trim())

  useEffect(() => {
    if (!showCategoryTabs) return
    const extraModes: PredictMode[] = ["without-category", "category-only"]
    for (const mode of extraModes) {
      fetchPredictionWithMode(initialParams, mode)
        .then((resp) => {
          setModeResults((prev) => ({ ...prev, [mode]: resp.colleges }))
        })
        .catch(() => {
          setModeResults((prev) => ({ ...prev, [mode]: [] }))
        })
    }
  }, [initialParams, showCategoryTabs])

  const resetFlow = () => router.push("/")

  const filteredColleges = modeResults[activeMode]

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
      // Alternate picks around center rank to keep both sides balanced.
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
    <div className="container max-w-[1400px] py-6 md:py-8">
      {/* Results */}
      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur">
        <CardHeader className="gap-4 border-b border-border/70 bg-gradient-to-r from-primary/[0.07] via-background to-background pb-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Prediction shortlist
          </div>

          <div>
            <CardTitle className="text-xl sm:text-2xl">Your college shortlist</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">{descriptionText}</CardDescription>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">General rank used</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{resolvedRank.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Institutes shown</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{limitedColleges.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Best chance count</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{countByChance.easy}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ListFilter className="h-3.5 w-3.5" />
                View
              </span>
              {showCategoryTabs && (
                <>
                  <Button
                    variant={activeMode === "combined" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMode("combined")}
                  >
                    Combined
                  </Button>
                  <Button
                    variant={activeMode === "without-category" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMode("without-category")}
                  >
                    Without Category
                  </Button>
                  <Button
                    variant={activeMode === "category-only" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMode("category-only")}
                  >
                    Category Only
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={maxResults} onValueChange={(v) => setMaxResults(v as "50" | "100" | "max")}>
                <SelectTrigger className="h-9 w-[140px] bg-background">
                  <SelectValue placeholder="Max results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 (default)</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2" onClick={resetFlow}>
                <RefreshCw className="h-4 w-4" />
                New search
              </Button>
            </div>
          </div>

          {hasResults ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">
                  Showing {limitedColleges.length} institute{limitedColleges.length === 1 ? "" : "s"}.
                </p>
                <Badge variant="secondary" className="gap-1.5">
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
