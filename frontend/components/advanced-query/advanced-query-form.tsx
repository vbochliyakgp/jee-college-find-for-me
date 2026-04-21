"use client"

import type { ComponentProps } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INDIAN_STATES } from "@/lib/predict/indian-states"
import type { IndianState } from "@/lib/predict/types"
import type { BandFields } from "@/lib/advanced-query/build-payload"
import type { CategoryOption, InstituteType } from "@/lib/advanced-query/types"
import { cn } from "@/lib/utils"
import {
  ADVANCED_QUERY_CATEGORIES,
  ADVANCED_QUERY_INSTITUTE_TYPES,
  useAdvancedQuery,
} from "@/components/advanced-query/advanced-query-context"

function Section({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-border/60 p-4 sm:p-5", className)} {...props} />
}

export function AdvancedQueryForm() {
  const q = useAdvancedQuery()
  const isMain = q.examType === "jee-main"
  const isAdvanced = q.examType === "jee-advanced"

  return (
    <form onSubmit={q.submitQuery} className="space-y-5">
      <Section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Exam</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["jee-main", "jee-advanced"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => q.setExamType(type)}
                  className={cn(
                    "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    q.examType === type ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {type === "jee-main" ? "Main" : "Advanced"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pool</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["neutral", "Neutral"],
                  ["female", "Female"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => q.setGenderPool(value)}
                  className={cn(
                    "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    q.genderPool === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={q.category} onValueChange={(v) => q.setCategory(v as CategoryOption)}>
              <SelectTrigger>
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
          <label className="flex cursor-pointer items-center gap-2 pb-2 sm:pb-3">
            <Checkbox id="is-pwd" checked={q.isPwd} onCheckedChange={(v) => q.setIsPwd(v === true)} />
            <span className="text-sm">PwD</span>
          </label>
        </div>

        {isMain ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Home state</Label>
            <Select
              value={q.homeState || "__none__"}
              onValueChange={(v) => q.setHomeState(v === "__none__" ? "" : (v as IndianState))}
            >
              <SelectTrigger title={`Quotas: ${q.quotasPreview}`}>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__none__">—</SelectItem>
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div
          className={cn(
            "space-y-2 rounded-lg transition-opacity",
            isAdvanced && "pointer-events-none opacity-50",
          )}
          aria-disabled={isAdvanced}
        >
          <Label className="text-xs text-muted-foreground">Institute</Label>
          <div className="flex flex-wrap gap-3">
            {ADVANCED_QUERY_INSTITUTE_TYPES.map((t: InstituteType) => (
              <label
                key={t}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isMain && "cursor-pointer",
                  isAdvanced && "cursor-default",
                )}
              >
                <Checkbox
                  checked={q.instituteSelected[t]}
                  disabled={isAdvanced}
                  onCheckedChange={(v) => q.toggleInstitute(t, v === true)}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section className="space-y-3">
        <p className="text-xs text-muted-foreground">Closing rank · optional bands (OR)</p>
        {(
          [
            ["open", "Open"],
            ["category", "Category"],
            ["openPwd", "Open PwD"],
            ["categoryPwd", "Cat PwD"],
          ] as const
        ).map(([key, title]) => {
          const k = key as keyof BandFields
          const enabled = q.bandKeyEnabled[k]
          return (
            <div
              key={key}
              className={cn(
                "grid gap-2 sm:grid-cols-[minmax(0,7rem)_1fr_1fr] sm:items-center",
                !enabled && "opacity-40",
              )}
            >
              <span className="text-sm font-medium text-foreground">{title}</span>
              <Input
                inputMode="numeric"
                placeholder="Min"
                className="h-9"
                disabled={!enabled}
                value={q.bands[k].min}
                onChange={(e) => q.setBandEdge(k, "min", e.target.value)}
                aria-invalid={!!q.bandErrors[k]}
              />
              <Input
                inputMode="numeric"
                placeholder="Max"
                className="h-9"
                disabled={!enabled}
                value={q.bands[k].max}
                onChange={(e) => q.setBandEdge(k, "max", e.target.value)}
                aria-invalid={!!q.bandErrors[k]}
              />
              {q.bandErrors[k] ? <p className="text-xs text-destructive sm:col-span-3">{q.bandErrors[k]}</p> : null}
            </div>
          )
        })}
      </Section>

      {q.clientError ? <p className="text-sm text-destructive">{q.clientError}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={q.isPending || q.hasBandErrors || q.instituteTypesList.length === 0}>
          {q.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          <span className="ml-2">Send</span>
        </Button>
      </div>

      {q.lastPayloadJson ? (
        <Section className="space-y-2 p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground">Request</p>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted/80 p-3 text-[11px] leading-relaxed">{q.lastPayloadJson}</pre>
        </Section>
      ) : null}

      {q.lastResult ? (
        <Section className="space-y-2 p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Response <span className="font-normal text-foreground/70">· {q.lastResult.status || "—"}</span>
          </p>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted/80 p-3 text-[11px] leading-relaxed">
            {q.lastResult.preview || "—"}
          </pre>
        </Section>
      ) : null}
    </form>
  )
}
