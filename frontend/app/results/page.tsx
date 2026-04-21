import type { Metadata } from "next"
import { CutoffResultsView } from "@/components/cutoff-results/cutoff-results-view"

export const metadata: Metadata = {
  title: "Cutoff results",
  description: "JoSAA-style cutoff rows by pool.",
  robots: { index: false, follow: true },
}

export default function ResultsPage() {
  return <CutoffResultsView />
}
