import type { Metadata } from "next"
import { Suspense } from "react"
import { CutoffResultsView } from "@/components/cutoff-results/cutoff-results-view"

export const metadata: Metadata = {
  title: "Cutoff results",
  description: "Tabbed cutoff results for your selected filters and rank ranges.",
  robots: { index: false, follow: true },
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-4xl py-16 text-center text-sm text-muted-foreground">Loading…</div>
      }
    >
      <CutoffResultsView />
    </Suspense>
  )
}
