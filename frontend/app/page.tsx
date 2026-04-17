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

export default function HomePage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
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
                Find Better-Fit Colleges with{" "}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  JEE + JoSAA Insights
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
      </section>
    </div>
  )
}
