"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BandFields } from "@/lib/advanced-query/build-payload"
import { cn } from "@/lib/utils"
import { FIELD_LABEL } from "@/components/cutoff-search/form-styles"
import type { AdvancedQueryContextValue } from "@/components/advanced-query/advanced-query-context"

const ROWS: ReadonlyArray<{ key: keyof BandFields; title: string }> = [
  { key: "open", title: "Open" },
  { key: "category", title: "Category" },
  { key: "openPwd", title: "Open PwD" },
  { key: "categoryPwd", title: "Cat PwD" },
]

export function RankBandFields({ q }: { q: AdvancedQueryContextValue }) {
  return (
    <div className="space-y-2">
      <Label className={FIELD_LABEL}>Closing rank bands (optional, OR within each row)</Label>
      <div className="space-y-3">
        {ROWS.map(({ key, title }) => {
          const enabled = q.bandKeyEnabled[key]
          return (
            <div key={key} className={cn("grid gap-2 sm:grid-cols-[7.5rem_1fr_1fr] sm:items-center", !enabled && "opacity-40")}>
              <span className="pt-2 text-sm font-medium text-foreground sm:pt-0">{title}</span>
              <Input
                inputMode="numeric"
                placeholder="Min"
                className={cn("h-11", q.bandErrors[key] && "border-destructive")}
                disabled={!enabled}
                value={q.bands[key].min}
                onChange={(e) => q.setBandEdge(key, "min", e.target.value)}
              />
              <Input
                inputMode="numeric"
                placeholder="Max"
                className={cn("h-11", q.bandErrors[key] && "border-destructive")}
                disabled={!enabled}
                value={q.bands[key].max}
                onChange={(e) => q.setBandEdge(key, "max", e.target.value)}
              />
              {q.bandErrors[key] ? <p className="text-xs text-destructive sm:col-span-3">{q.bandErrors[key]}</p> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
