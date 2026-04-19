"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { INDIAN_STATES } from "@/lib/predict/indian-states"
import type { ExamType, Gender, IndianState } from "@/lib/predict/types"

export function HomeForm() {
  const router = useRouter()
  const [isNavigating, startTransition] = useTransition()

  const [examType, setExamType] = useState<ExamType>("jee-main")
  const [score, setScore] = useState("")
  const [gender, setGender] = useState<Gender>("gender-neutral")
  const [homeState, setHomeState] = useState<IndianState | "">("")
  const [category, setCategory] = useState("General")
  const [categoryRank, setCategoryRank] = useState("")
  const [isPWD, setIsPWD] = useState(false)
  const [openPwdRank, setOpenPwdRank] = useState("")
  const [categoryPwdRank, setCategoryPwdRank] = useState("")

  // Touched tracks fields the user has interacted with at least once.
  // Errors are only shown for touched fields OR after a submit attempt.
  const [touched, setTouched] = useState({
    score: false,
    categoryRank: false,
    openPwdRank: false,
    categoryPwdRank: false,
  })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const needsCategoryRank = category !== "General"

  // ── Inline derived errors ──
  const scoreError = (() => {
    if (!score.trim()) return "Enter your rank."
    const val = parseInt(score.trim(), 10)
    if (Number.isNaN(val) || val < 1 || val > 1_300_000) return "Must be 1 – 13,00,000."
    return null
  })()

  const categoryRankError = (() => {
    if (!needsCategoryRank) return null
    if (!categoryRank.trim()) return "Enter your category rank."
    const val = parseInt(categoryRank.trim(), 10)
    if (Number.isNaN(val) || val < 1 || val > 1_300_000) return "Must be 1 – 13,00,000."
    return null
  })()

  const openPwdRankError = (() => {
    if (!isPWD || !openPwdRank.trim()) return null
    const val = parseInt(openPwdRank.trim(), 10)
    if (Number.isNaN(val) || val < 1 || val > 1_300_000) return "Must be 1 – 13,00,000."
    return null
  })()

  const categoryPwdRankError = (() => {
    if (!isPWD || !needsCategoryRank || !categoryPwdRank.trim()) return null
    const val = parseInt(categoryPwdRank.trim(), 10)
    if (Number.isNaN(val) || val < 1 || val > 1_300_000) return "Must be 1 – 13,00,000."
    return null
  })()

  // A field shows its error when touched OR after a submit attempt
  const showScore = touched.score || submitAttempted
  const showCategoryRank = touched.categoryRank || submitAttempted
  const showOpenPwdRank = touched.openPwdRank || submitAttempted
  const showCategoryPwdRank = touched.categoryPwdRank || submitAttempted

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  const handleExamToggle = (type: ExamType) => setExamType(type)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isNavigating) return
    setSubmitAttempted(true)
    if (scoreError || categoryRankError || openPwdRankError || categoryPwdRankError) return

    const params = new URLSearchParams({
      exam: examType,
      score: score.trim(),
      gender,
      category,
    })
    if (examType === "jee-main" && homeState) params.set("state", homeState)
    if (needsCategoryRank && categoryRank.trim()) params.set("categoryRank", categoryRank.trim())
    const hasPwdRank = openPwdRank.trim() || categoryPwdRank.trim()
    if (isPWD && hasPwdRank) {
      params.set("pwd", "true")
      if (openPwdRank.trim()) params.set("openPwdRank", openPwdRank.trim())
      if (needsCategoryRank && categoryPwdRank.trim()) params.set("categoryPwdRank", categoryPwdRank.trim())
    }

    startTransition(() => {
      router.push(`/predict?${params.toString()}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Exam type */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Exam
        </Label>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["jee-main", "jee-advanced"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleExamToggle(type)}
              className={cn(
                "rounded-lg py-2.5 text-sm font-medium transition-all",
                examType === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {type === "jee-main" ? "JEE Main" : "JEE Advanced"}
            </button>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Rank
        </Label>
        <Input
          placeholder="e.g. 12345"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          onBlur={() => touch("score")}
          inputMode="numeric"
          className={cn("h-12 text-base", showScore && scoreError && "border-destructive focus-visible:ring-0 focus-visible:ring-offset-0")}
        />
        {showScore && scoreError && (
          <p className="text-xs text-destructive">{scoreError}</p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Gender quota
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["gender-neutral", "Gender-neutral"],
              ["female", "Female"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setGender(val)}
              className={cn(
                "rounded-xl border py-3 text-sm font-medium transition-colors",
                gender === val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Home State */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Home state
        </Label>
        <Select value={homeState} onValueChange={(v) => setHomeState(v as IndianState)} disabled={examType === "jee-advanced"}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder={examType === "jee-advanced" ? "Not used for JEE Advanced" : "Select your home state"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Category
        </Label>
        <div className={cn("grid gap-2", needsCategoryRank ? "grid-cols-2" : "grid-cols-1")}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="OBC">OBC-NCL</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
              <SelectItem value="ST">ST</SelectItem>
              <SelectItem value="EWS">EWS</SelectItem>
            </SelectContent>
          </Select>
          {needsCategoryRank && (
            <div className="flex flex-col gap-1">
              <Input
                placeholder="Category rank"
                value={categoryRank}
                onChange={(e) => setCategoryRank(e.target.value)}
                onBlur={() => touch("categoryRank")}
                inputMode="numeric"
                className={cn(
                  "h-11",
                  showCategoryRank && categoryRankError && "border-destructive focus-visible:ring-0 focus-visible:ring-offset-0",
                )}
              />
              {showCategoryRank && categoryRankError && (
                <p className="text-xs text-destructive">{categoryRankError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PwD */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPWD}
            onChange={(e) => setIsPWD(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            PwD reservation
          </span>
        </label>

        {isPWD && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Input
                placeholder="OPEN-PwD rank"
                value={openPwdRank}
                onChange={(e) => setOpenPwdRank(e.target.value)}
                onBlur={() => touch("openPwdRank")}
                inputMode="numeric"
                className={cn("h-11", showOpenPwdRank && openPwdRankError && "border-destructive focus-visible:ring-0 focus-visible:ring-offset-0")}
              />
              {showOpenPwdRank && openPwdRankError && <p className="text-xs text-destructive">{openPwdRankError}</p>}
            </div>
            {needsCategoryRank && (
              <div className="flex flex-col gap-1">
                <Input
                  placeholder={`${category}-PwD rank`}
                  value={categoryPwdRank}
                  onChange={(e) => setCategoryPwdRank(e.target.value)}
                  onBlur={() => touch("categoryPwdRank")}
                  inputMode="numeric"
                  className={cn(
                    "h-11",
                    showCategoryPwdRank && categoryPwdRankError && "border-destructive focus-visible:ring-0 focus-visible:ring-offset-0",
                  )}
                />
                {showCategoryPwdRank && categoryPwdRankError && (
                  <p className="text-xs text-destructive">{categoryPwdRankError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isNavigating}
        aria-busy={isNavigating}
        className="w-full h-12 rounded-full text-base font-semibold shadow-md gap-2"
      >
        {isNavigating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            Predict My Colleges
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

    </form>
  )
}
