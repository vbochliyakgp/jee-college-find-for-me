"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
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
    <div className="container max-w-[1400px] py-8">
      {/* Results */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Your shortlist</CardTitle>
            <CardDescription>{descriptionText}</CardDescription>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="text-2xl font-semibold tabular-nums text-primary">{resolvedRank.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">General rank used</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
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
            <Select value={maxResults} onValueChange={(v) => setMaxResults(v as "50" | "100" | "max")}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Max results" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 (default)</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasResults ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Showing {limitedColleges.length} institute{limitedColleges.length === 1 ? "" : "s"}.
                </p>
                <Button variant="outline" size="sm" className="gap-2" onClick={resetFlow}>
                  <RefreshCw className="h-4 w-4" />
                  New search
                </Button>
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
            <div className="py-12 text-center text-muted-foreground">
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
