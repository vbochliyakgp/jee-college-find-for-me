"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { CutoffQueryResponse, CutoffResultRow } from "@/lib/advanced-query/types"
import { useAdvancedQuery } from "@/components/advanced-query/advanced-query-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PoolKey = keyof CutoffQueryResponse["pools"]

const TABS: ReadonlyArray<{ key: PoolKey; label: string }> = [
  { key: "open", label: "Open" },
  { key: "category", label: "Category" },
  { key: "openPwd", label: "Open PwD" },
  { key: "categoryPwd", label: "Cat PwD" },
]

function PoolTable({ rows }: { rows: CutoffResultRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No rows for this band.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border/80 bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5">Institute</th>
            <th className="px-3 py-2.5">Program</th>
            <th className="px-3 py-2.5">Seat</th>
            <th className="px-3 py-2.5">Quota</th>
            <th className="px-3 py-2.5">Gender</th>
            <th className="px-3 py-2.5 text-right">Open</th>
            <th className="px-3 py-2.5 text-right">Close</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.institute}-${r.department}-${r.seat_type}-${r.quota}-${r.closing_rank}-${i}`} className="border-b border-border/40 last:border-0">
              <td className="max-w-[220px] px-3 py-2 align-top text-foreground">{r.institute}</td>
              <td className="max-w-[200px] px-3 py-2 align-top text-muted-foreground">{r.department}</td>
              <td className="whitespace-nowrap px-3 py-2">{r.seat_type}</td>
              <td className="whitespace-nowrap px-3 py-2">{r.quota}</td>
              <td className="whitespace-nowrap px-3 py-2">{r.gender}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.opening_rank}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">{r.closing_rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CutoffResultsView() {
  const router = useRouter()
  const q = useAdvancedQuery()
  const data = q.lastSuccessResponse
  const [tab, setTab] = useState<PoolKey>("open")

  useEffect(() => {
    if (!data) {
      router.replace("/")
    }
  }, [data, router])

  const rows = useMemo(() => {
    if (!data) return []
    return data.pools[tab]
  }, [data, tab])

  if (!data) {
    return (
      <div className="container max-w-4xl py-16 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="container max-w-[1200px] py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Cutoff results</h1>
          <p className="mt-1 text-sm text-muted-foreground">Four pools · same global filters · each tab uses its own seat types and rank band.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            q.clearResults()
            router.replace("/")
          }}
        >
          New search
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-border/70 pb-px">
        {TABS.map(({ key, label }) => {
          const n = data.pools[key].length
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-t-lg border border-b-0 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-border bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">({n})</span>
            </button>
          )
        })}
      </div>

      <PoolTable rows={rows} />
    </div>
  )
}
