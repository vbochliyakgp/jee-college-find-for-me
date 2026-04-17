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
  const hasFemaleCutoff = typeof dept.female_closing_rank === "number"

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{institute.institute}</h3>
          <p className="mt-1 text-sm">{dept.department}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{institute.institute_type}</Badge>
            <span>{institute.state}</span>
            {isFemalePool ? (
              <>
                {hasGeneralCutoff && <span>General closing rank: {dept.general_closing_rank}</span>}
                {hasFemaleCutoff ? (
                  <span>Female closing rank: {dept.female_closing_rank}</span>
                ) : (
                  <span>Female closing rank: {dept.closing_rank}</span>
                )}
                <Badge variant="outline">Female</Badge>
              </>
            ) : (
              <span>Closing rank: {dept.closing_rank}</span>
            )}
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>{chance}</span>
      </div>
    </div>
  )
}
