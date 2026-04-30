"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { AdvancedCutoffQueryV1, CutoffQueryResponse, CutoffResultRow } from "@/lib/advanced-query/types"
import { decodeCutoffQueryFromUrl } from "@/lib/advanced-query/query-url"
import { postCutoffQuery } from "@/lib/advanced-query/api"
import { useAdvancedQuery } from "@/components/advanced-query/advanced-query-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PoolKey = keyof CutoffQueryResponse["pools"]
const PAGE_SIZE = 100

const TABS: ReadonlyArray<{ key: PoolKey; label: string }> = [
  { key: "open", label: "Open" },
  { key: "category", label: "Category" },
  { key: "openPwd", label: "Open PwD" },
  { key: "categoryPwd", label: "Cat PwD" },
]

function toFriendlyApiError(error: string, status?: number, retryAfterSeconds?: number): string {
  if (status === 429) {
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      return `Too many requests. Please retry in ${retryAfterSeconds}s.`
    }
    return "Too many requests. Please retry after some time."
  }
  return error
}

function toTargetPool(k: PoolKey): AdvancedCutoffQueryV1["powerMode"]["closingRankBands"][number]["targetPool"] {
  switch (k) {
    case "open":
      return "open"
    case "category":
      return "category"
    case "openPwd":
      return "open_pwd"
    case "categoryPwd":
      return "category_pwd"
  }
}

function PoolTable({ rows, isCsab }: { rows: CutoffResultRow[]; isCsab?: boolean }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No results found for this page.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[640px] text-left text-xs sm:min-w-[700px] sm:text-sm">
        <thead className="border-b border-border/80 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
          <tr>
            <th className="px-2 py-2 sm:px-3 sm:py-2.5">Institute</th>
            <th className="px-2 py-2 sm:px-3 sm:py-2.5">Program</th>
            <th className="px-2 py-2 sm:px-3 sm:py-2.5">Seat</th>
            <th className="px-2 py-2 sm:px-3 sm:py-2.5">Quota</th>
            <th className="px-2 py-2 sm:px-3 sm:py-2.5">Gender</th>
            <th className="px-2 py-2 text-right sm:px-3 sm:py-2.5">{isCsab ? "Open CRL" : "Open"}</th>
            <th className="px-2 py-2 text-right sm:px-3 sm:py-2.5">{isCsab ? "Close CRL" : "Close"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.institute}-${r.department}-${r.seat_type}-${r.quota}-${r.closing_rank}-${i}`} className="border-b border-border/40 last:border-0">
              <td className="max-w-[165px] px-2 py-2 align-top leading-snug text-foreground sm:max-w-[220px] sm:px-3">
                {r.institute}
              </td>
              <td className="max-w-[160px] px-2 py-2 align-top leading-snug text-muted-foreground sm:max-w-[220px] sm:px-3">
                {r.department}
              </td>
              <td className="whitespace-nowrap px-2 py-2 sm:px-3">{r.seat_type}</td>
              <td className="whitespace-nowrap px-2 py-2 sm:px-3">{r.quota}</td>
              <td className="whitespace-nowrap px-2 py-2 sm:px-3">{r.gender}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums sm:px-3">{r.opening_rank}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums font-medium sm:px-3">{r.closing_rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CutoffResultsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = useAdvancedQuery()
  const enc = searchParams.get("q")
  const payload = useMemo(() => (enc ? decodeCutoffQueryFromUrl(enc) : null), [enc])

  const [tab, setTab] = useState<PoolKey>("open")
  const [pageByTab, setPageByTab] = useState<Record<PoolKey, number>>({
    open: 1,
    category: 1,
    openPwd: 1,
    categoryPwd: 1,
  })
  const [rowsByTab, setRowsByTab] = useState<Record<PoolKey, CutoffResultRow[]>>({
    open: [],
    category: [],
    openPwd: [],
    categoryPwd: [],
  })
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<PoolKey, boolean>>({
    open: false,
    category: false,
    openPwd: false,
    categoryPwd: false,
  })
  const [truncatedByTab, setTruncatedByTab] = useState<Record<PoolKey, boolean>>({
    open: false,
    category: false,
    openPwd: false,
    categoryPwd: false,
  })
  const [loadedKey, setLoadedKey] = useState<Record<PoolKey, string | null>>({
    open: null,
    category: null,
    openPwd: null,
    categoryPwd: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlightKey = useRef<string | null>(null)
  const enabledByTab = useMemo<Record<PoolKey, boolean>>(() => {
    if (!payload) {
      return { open: true, category: true, openPwd: true, categoryPwd: true }
    }
    const hasBand = (targetPool: AdvancedCutoffQueryV1["powerMode"]["closingRankBands"][number]["targetPool"]) =>
      payload.powerMode.closingRankBands.some(
        (b) => b.targetPool === targetPool && (b.closingRankMin !== null || b.closingRankMax !== null),
      )

    const base = {
      open: hasBand("open"),
      category: hasBand("category"),
      openPwd: hasBand("open_pwd"),
      categoryPwd: hasBand("category_pwd"),
    }

    // In CSAB mode, we mirror the "open" band to other pools on the backend.
    // So if "open" has a band, we should enable the other tabs if they are eligible for the user's category/isPwd.
    if (payload.counseling === "csab" && base.open) {
      const isOBCPlus = payload.category !== "General"
      const isPwd = payload.isPwd
      return {
        open: true,
        category: isOBCPlus,
        openPwd: isPwd,
        categoryPwd: isOBCPlus && isPwd,
      }
    }

    return base
  }, [payload])

  const currentPage = pageByTab[tab]
  const rows = rowsByTab[tab]
  const hasMore = hasMoreByTab[tab]
  const truncated = truncatedByTab[tab]
  const isCsab = payload?.counseling === "csab"

  useEffect(() => {
    if (!enc) {
      router.replace("/")
      return
    }
    if (!payload) {
      setError("This results link is invalid or outdated.")
    }
  }, [enc, payload, router])

  useEffect(() => {
    if (!payload) return
    if (!enabledByTab[tab]) return
    const page = pageByTab[tab]
    const key = `${tab}:${page}`
    if (loadedKey[tab] === key) return
    if (inFlightKey.current === key) return

    inFlightKey.current = key
    setLoading(true)
    setError(null)

    void postCutoffQuery({
      ...payload,
      pagination: {
        targetPool: toTargetPool(tab),
        page,
        pageSize: PAGE_SIZE,
      },
    })
      .then((res) => {
        if (!res.ok) {
          setError(toFriendlyApiError(res.error, res.status, res.retryAfterSeconds))
          return
        }
        const meta = res.data.meta?.[tab]
        setRowsByTab((prev) => ({ ...prev, [tab]: res.data.pools[tab] }))
        setHasMoreByTab((prev) => ({ ...prev, [tab]: meta?.hasMore ?? res.data.pools[tab].length === PAGE_SIZE }))
        setTruncatedByTab((prev) => ({ ...prev, [tab]: Boolean(meta?.truncated) }))
        setLoadedKey((prev) => ({ ...prev, [tab]: key }))
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Network error")
      })
      .finally(() => {
        if (inFlightKey.current === key) inFlightKey.current = null
        setLoading(false)
      })
  }, [payload, tab, pageByTab, loadedKey, enabledByTab])

  useEffect(() => {
    if (enabledByTab[tab]) return
    const firstEnabled = TABS.find((t) => enabledByTab[t.key])
    if (firstEnabled) setTab(firstEnabled.key)
  }, [enabledByTab, tab])

  if (!enc) {
    return (
      <div className="container max-w-4xl py-16 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="container max-w-md py-16 text-center">
        <p className="text-sm text-destructive">{error ?? "Invalid results link."}</p>
        <Button type="button" className="mt-6" onClick={() => router.replace("/")}>
          Back to search
        </Button>
      </div>
    )
  }

  return (
    <div className="container max-w-[1200px] py-8 md:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Cutoff results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare results in four simple tabs, and move page by page in each tab.
          </p>
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

      <div className="mb-4 border-b border-border/70 pb-px">
        <div className="-mx-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max flex-nowrap gap-1 px-1">
            {TABS.map(({ key, label }) => {
              const active = tab === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!enabledByTab[key]}
                  onClick={() => {
                    if (!enabledByTab[key]) return
                    setTab(key)
                  }}
                  className={cn(
                    "shrink-0 rounded-t-lg border border-b-0 px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                    active
                      ? "border-border bg-background text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                    !enabledByTab[key] && "cursor-not-allowed opacity-50 line-through hover:text-muted-foreground",
                  )}
                  title={enabledByTab[key] ? undefined : "No rank range selected for this pool"}
                >
                  {label}
                  <span className="ml-1 tabular-nums text-[10px] text-muted-foreground sm:ml-1.5 sm:text-xs">
                    (p{pageByTab[key]})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mb-3 h-6 text-xs text-muted-foreground">
        {loading ? "Loading page…" : error ? <span className="text-destructive">{error}</span> : `Page ${currentPage} · ${rows.length} rows`}
      </div>

      <div className="min-h-[420px]">
        {enabledByTab[tab] ? (
          <PoolTable rows={rows} isCsab={isCsab} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This pool is disabled because no rank range was selected for it.
          </p>
        )}
      </div>

      {truncated ? (
        <p className="mt-3 text-xs text-amber-600">This pool hit the backend hard cap. Narrow filters for complete results.</p>
      ) : null}

      <div className="mt-4 grid grid-cols-3 items-center gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={loading || !enabledByTab[tab] || currentPage <= 1}
          onClick={() => setPageByTab((prev) => ({ ...prev, [tab]: Math.max(1, prev[tab] - 1) }))}
        >
          Previous
        </Button>
        <span className="min-w-20 text-center text-sm tabular-nums">Page {currentPage}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={loading || !enabledByTab[tab] || !hasMore}
          onClick={() => setPageByTab((prev) => ({ ...prev, [tab]: prev[tab] + 1 }))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
