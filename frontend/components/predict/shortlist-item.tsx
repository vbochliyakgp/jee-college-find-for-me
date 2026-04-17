"use client"

import { Badge } from "@/components/ui/badge"
import { chanceBadge } from "@/lib/theme"
import type { GroupedCollege } from "@/lib/predict/types"

interface ShortlistItemProps {
  institute: GroupedCollege
}

export function ShortlistItem({ institute }: ShortlistItemProps) {
  const dept = institute.departments[0]
  if (!dept) return null

  const chance = dept.chance ?? "easy"
  const color = chance === "dream" ? chanceBadge.low : chanceBadge.high
  const isFemalePool = dept.gender.toLowerCase() === "female"
  const hasGeneralCutoff = typeof dept.general_closing_rank === "number"
  const quota = (dept.quota ?? "").toUpperCase()
  const isStateQuota = quota === "HS" || quota === "GO" || quota === "JK" || quota === "LA"
  const seatType = (dept.seat_type ?? "").toUpperCase()
  const isCategorySeat = seatType !== "OPEN"
  const isCategorySelected = dept.rank_type === "category" || dept.used_category === true
  const isHomeStateSelected = dept.used_home_state === true || isStateQuota

  return (
    <div className="card-hover rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-medium">{institute.institute_type}</Badge>
            <span className="text-xs text-muted-foreground">{institute.state}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-snug sm:text-lg">{institute.institute}</h3>
          <p className="mt-1 text-sm text-foreground/90">{dept.department}</p>

          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 sm:text-sm">
            {hasGeneralCutoff ? (
              <span className="rounded-lg bg-muted/45 px-2.5 py-1.5">
                General closing rank: {dept.general_closing_rank}
              </span>
            ) : (
              <span className="rounded-lg bg-muted/45 px-2.5 py-1.5">General closing: N/A</span>
            )}
            <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-primary">
              Closing for you: {dept.closing_rank}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {isStateQuota && (
              <Badge variant="outline">Quota: {quota}</Badge>
            )}
            {isCategorySeat && <Badge variant="outline">Seat: {seatType}</Badge>}
            {isFemalePool && <Badge variant="outline">Gender: Female</Badge>}
            {isHomeStateSelected && <Badge variant="outline">Selected via State Quota</Badge>}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${color}`}>{chance}</span>
      </div>
    </div>
  )
}
