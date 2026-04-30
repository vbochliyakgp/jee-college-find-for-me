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
  const isCsab = q.counseling === "csab"

  if (isCsab) {
    const handleCrlChange = (edge: "min" | "max", value: string) => {
      q.setBandEdge("open", edge, value)
    }

    return (
      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Rank range (CRL only for all categories)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="numeric"
            placeholder="Min CRL Rank"
            className={cn("h-11", q.hasBandErrors && "border-destructive")}
            value={q.bands.open.min}
            onChange={(e) => handleCrlChange("min", e.target.value)}
          />
          <Input
            inputMode="numeric"
            placeholder="Max CRL Rank"
            className={cn("h-11", q.hasBandErrors && "border-destructive")}
            value={q.bands.open.max}
            onChange={(e) => handleCrlChange("max", e.target.value)}
          />
        </div>
        {q.hasBandErrors && <p className="text-xs text-destructive">Enter valid positive integers; min must be ≤ max.</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className={FIELD_LABEL}>Closing rank bands (optional, OR within each row)</Label>
      <div className="space-y-3">
        {ROWS.map(({ key, title }) => {
          const enabled = q.bandKeyEnabled[key]
          return (
            <div key={key} className={cn("grid grid-cols-[5.75rem_1fr_1fr] items-center gap-2", !enabled && "opacity-40")}>
              <span className="text-sm font-medium text-foreground">{title}</span>
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
              {q.bandErrors[key] ? <p className="col-span-3 text-xs text-destructive">{q.bandErrors[key]}</p> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
