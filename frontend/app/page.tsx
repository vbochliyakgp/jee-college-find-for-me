import type { Metadata } from "next"
import { CheckCircle2 } from "lucide-react"
import { CutoffSearchForm } from "@/components/cutoff-search/cutoff-search-form"

const trustPoints = [
  "JEE Main and JEE Advanced cutoff snapshots",
  "Filter by exam, gender pool, category, PwD, home state, institute type, and closing-rank bands",
  "Results split into Open, Category, Open PwD, and Category PwD pools",
  "No signup and no personal contact details",
]

export const metadata: Metadata = {
  title: "JoSAA cutoff search | JEE College Find",
  description:
    "Search JoSAA-style cutoffs across IITs, NITs, IIITs, and GFTIs with quota, institute, and closing-rank filters. Free, no signup.",
  keywords: ["JoSAA cutoffs", "JEE Main cutoffs", "JEE Advanced cutoffs", "IIT closing rank", "NIT cutoffs"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "JoSAA cutoff search | JEE College Find",
    description: "Filter official-style cutoff rows and compare programs. No signup.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JoSAA cutoff search | JEE College Find",
    description: "Filter cutoff rows by exam, quota, institute type, and rank bands.",
  },
}

export default function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "JEE College Find",
        url: siteUrl,
      },
      {
        "@type": "SoftwareApplication",
        name: "JEE College Find",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        description: "JoSAA-style cutoff search for JEE Main and JEE Advanced counseling data.",
      },
    ],
  }

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_15%_20%,hsl(var(--primary)/0.14),transparent),radial-gradient(ellipse_55%_45%_at_90%_75%,hsl(var(--primary)/0.1),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-8rem] -z-10 h-[22rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <section className="container w-full max-w-[1400px] py-6 md:py-14">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-4 sm:space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-primary sm:px-4 sm:py-1.5 sm:text-xs">
              Cutoff snapshot search
            </span>

            <div>
              <h1 className="text-balance text-[1.7rem] font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.15rem] lg:leading-tight">
                Explore cutoffs by rank band{" "}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  — free &amp; simple
                </span>
              </h1>
              <p className="mt-2 max-w-xl text-pretty text-sm text-muted-foreground sm:mt-4 sm:text-lg">
                Set exam, quotas, institute types, and optional closing-rank windows for each seat pool. We return matching
                rows from the loaded counseling snapshot.
              </p>
            </div>

            <ul className="flex flex-col gap-2 sm:gap-3">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-muted-foreground sm:gap-2.5 sm:text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pt-2">
            <div className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-lg shadow-primary/5 backdrop-blur lg:p-7">
              <CutoffSearchForm />
            </div>
          </div>
        </div>

        <section className="mt-8 space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Note</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            This is not official JoSAA software. Use official counseling portals for choice filling and eligibility rules.
          </p>
        </section>
      </section>
    </div>
  )
}
