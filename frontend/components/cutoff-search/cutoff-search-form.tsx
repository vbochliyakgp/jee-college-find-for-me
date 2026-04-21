"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INDIAN_STATES } from "@/lib/geo/indian-states"
import type { IndianState } from "@/lib/geo/indian-states"
import type { CategoryOption, InstituteType } from "@/lib/advanced-query/types"
import { cn } from "@/lib/utils"
import {
  ADVANCED_QUERY_CATEGORIES,
  ADVANCED_QUERY_INSTITUTE_TYPES,
  useAdvancedQuery,
} from "@/components/advanced-query/advanced-query-context"
import { RankBandFields } from "@/components/cutoff-search/rank-band-fields"
import { EXAM_TOGGLE_WRAP, FIELD_LABEL, examToggleClass, poolCardClass } from "@/components/cutoff-search/form-styles"

export function CutoffSearchForm() {
  const q = useAdvancedQuery()
  const router = useRouter()
  const isMain = q.examType === "jee-main"
  const isAdvanced = q.examType === "jee-advanced"

  const onSubmit = (e: React.FormEvent) => {
    q.submitQuery(e, {
      onSuccess: () => router.push("/results"),
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Exam</Label>
        <div className={EXAM_TOGGLE_WRAP}>
          {(["jee-main", "jee-advanced"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => q.setExamType(type)}
              className={examToggleClass(q.examType === type)}
            >
              {type === "jee-main" ? "JEE Main" : "JEE Advanced"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Gender pool</Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["neutral", "Gender-neutral"],
              ["female", "Female"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => q.setGenderPool(value)}
              className={poolCardClass(q.genderPool === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Category</Label>
        <Select value={q.category} onValueChange={(v) => q.setCategory(v as CategoryOption)}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADVANCED_QUERY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3 select-none">
          <Checkbox id="is-pwd" checked={q.isPwd} onCheckedChange={(v) => q.setIsPwd(v === true)} />
          <span className={FIELD_LABEL}>PwD</span>
        </label>
      </div>

      <div className={cn("space-y-2", isAdvanced && "opacity-60")}>
        <Label className={FIELD_LABEL}>Home state</Label>
        <Select
          value={q.homeState || "__none__"}
          onValueChange={(v) => q.setHomeState(v === "__none__" ? "" : (v as IndianState))}
          disabled={isAdvanced}
        >
          <SelectTrigger
            className="h-11"
            title={isAdvanced ? "Home state applies to JEE Main only" : `Quotas: ${q.quotasPreview}`}
          >
            <SelectValue placeholder={isAdvanced ? "Not used for JEE Advanced" : "Optional — AI + OS only"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__none__">Not set (AI + OS)</SelectItem>
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "space-y-2 rounded-xl border border-transparent p-1 transition-opacity",
          isAdvanced && "pointer-events-none opacity-50",
        )}
        aria-disabled={isAdvanced}
      >
        <Label className={FIELD_LABEL}>Institute type</Label>
        <div className="flex flex-wrap gap-3">
          {ADVANCED_QUERY_INSTITUTE_TYPES.map((t: InstituteType) => {
            const iitDisabledOnMain = isMain && t === "IIT"
            return (
              <label
                key={t}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isMain && !iitDisabledOnMain && "cursor-pointer",
                  isAdvanced && "cursor-default",
                  iitDisabledOnMain && "cursor-not-allowed opacity-60",
                )}
              >
                <Checkbox
                  checked={q.instituteSelected[t]}
                  disabled={isAdvanced || iitDisabledOnMain}
                  onCheckedChange={(v) => q.toggleInstitute(t, v === true)}
                />
                {t}
              </label>
            )
          })}
        </div>
      </div>

      <RankBandFields q={q} />

      {q.clientError ? <p className="text-xs text-destructive">{q.clientError}</p> : null}
      {q.lastErrorDetails && q.lastErrorDetails.length > 0 ? (
        <ul className="list-inside list-disc text-xs text-destructive">
          {q.lastErrorDetails.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={q.isPending || q.hasBandErrors || q.instituteTypesList.length === 0}
        aria-busy={q.isPending}
        className="h-12 w-full gap-2 rounded-full text-base font-semibold shadow-md"
      >
        {q.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </>
        ) : (
          <>
            Search cutoffs
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}
