import type { Metadata } from "next"
import { AdvancedQueryProvider } from "@/components/advanced-query/advanced-query-context"
import { AdvancedQueryForm } from "@/components/advanced-query/advanced-query-form"

export const metadata: Metadata = {
  title: "Cutoff search",
  description: "Filter JoSAA-style cutoffs and send a JSON query to the API.",
  robots: {
    index: false,
    follow: true,
  },
}

export default function AdvancedQueryPage() {
  return (
    <AdvancedQueryProvider>
      <div className="container max-w-3xl py-8 md:py-12">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Cutoff search</h1>
        </div>
        <AdvancedQueryForm />
      </div>
    </AdvancedQueryProvider>
  )
}
