import type { Metadata } from "next"
import { ArrowRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react"
import { HomeForm } from "@/components/home-form"

const trustPoints = [
  "Covers JEE Main (NITs, IIITs, GFTIs) and JEE Advanced (IITs)",
  "Safe, Target, and Dream breakdown per branch and institute",
  "Category, gender, and quota-aware results in one view",
  "Fast prediction flow with no login and no ads",
]

const quickHighlights = [
  { icon: Sparkles, title: "Clean UI", detail: "Focused input flow, less clutter." },
  { icon: TrendingUp, title: "Better compare", detail: "Quickly scan realistic options." },
  { icon: ArrowRight, title: "One-click start", detail: "Enter rank and get results fast." },
]

export const metadata: Metadata = {
  title: "JEE College Predictor | JoSAA Rank-Based College Finder",
  description:
    "Use this free JEE college predictor to explore likely IIT, NIT, IIIT, and GFTI options by rank, category, gender, and home-state quota. No signup or personal contact details required.",
  keywords: [
    "JEE predictor",
    "JEE Main college predictor",
    "JEE Advanced college predictor",
    "JoSAA college predictor",
    "IIT NIT IIIT predictor",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "JEE College Predictor | JoSAA Rank-Based College Finder",
    description:
      "Free JEE college predictor with no signup and no email/phone requirement.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JEE College Predictor | JoSAA Rank-Based College Finder",
    description:
      "Free JEE college predictor. No signup and no personal contact details required.",
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
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/predict?exam={exam}&score={score}&gender={gender}&category={category}`,
          "query-input": [
            "required name=exam",
            "required name=score",
            "required name=gender",
            "required name=category",
          ],
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "JEE College Find",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        featureList: [
          "No signup required",
          "No email required",
          "No phone number required",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
        },
        description:
          "Rank-based JEE Main and JEE Advanced college predictor for IITs, NITs, IIITs, and GFTIs.",
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is this an official JoSAA counseling tool?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. It is an exploratory rank-based planning tool and not official counseling advice.",
            },
          },
          {
            "@type": "Question",
            name: "Which exams are supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "JEE Main and JEE Advanced prediction paths are supported.",
            },
          },
          {
            "@type": "Question",
            name: "Are PwD, B.Arch, and B.Planning flows supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "PwD flow is supported. B.Arch and B.Planning flows are currently not supported.",
            },
          },
          {
            "@type": "Question",
            name: "Is this tool free and do I need to share personal contact details?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, the tool is free to use. No signup, email, or phone number is required to use prediction features.",
            },
          },
        ],
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
              Latest available cutoff snapshot
            </span>

            <div>
              <h1 className="text-balance text-[1.7rem] font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.15rem] lg:leading-tight">
              Find Better-Fit Colleges for Free{" "}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                — No Signup Needed!
                </span>
              </h1>
              <p className="mt-2 max-w-xl text-pretty text-sm text-muted-foreground sm:mt-4 sm:text-lg">
                Enter your rank once and explore balanced options across institutes and branches. Built for quick, practical decision-making.
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

            <div className="hidden gap-3 sm:grid sm:grid-cols-3">
              {quickHighlights.map(({ icon: Icon, title, detail }) => (
                <div key={title} className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm">
                  <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:pt-2">
            <div className="rounded-2xl border border-border/70 bg-card/95 p-6 shadow-lg shadow-primary/5 backdrop-blur lg:p-7">
              <HomeForm />
            </div>
          </div>
        </div>

        <section className="mt-8 space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            How this JEE college predictor works
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            We compare your submitted rank against program-level closing ranks and show practical options across JEE Main
            and JEE Advanced counseling data. Use this shortlist as a planning aid before final JoSAA choice filling.
          </p>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">Important note</h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            B.Arch, B.Planning, and IIT preparatory-course paths are currently not supported.
          </p>
        </section>

        <section className="mt-6 space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            JEE college predictor FAQs
          </h2>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground sm:text-base">Can I use this for JoSAA choice filling?</h3>
            <p className="text-sm text-muted-foreground sm:text-base">
              Yes, as a shortlist aid. Always validate with official JoSAA counseling data before final submission.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              Does it cover IIT, NIT, IIIT, and GFTI predictions?
            </h3>
            <p className="text-sm text-muted-foreground sm:text-base">
              Yes. The tool is built to help compare likely options across IITs, NITs, IIITs, and GFTIs based on your
              submitted rank details.
            </p>
          </div>
        </section>
      </section>
    </div>
  )
}
