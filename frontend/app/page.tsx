import { CheckCircle2 } from "lucide-react"
import { HomeForm } from "@/components/home-form"

const trustPoints = [
  "Covers JEE Main (NITs, IIITs, GFTIs) and JEE Advanced (IITs)",
  "Safe · Target · Dream breakdown per program",
  "Home-state and All-India quota filtering",
  "No account, no ads — backed by a Go predictor API",
]

export default function HomePage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center">
      {/* Background glow — sits behind the left copy column */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_25%_40%,hsl(var(--primary)/0.09),transparent)]"
      />

      <section className="container w-full max-w-[1400px] py-10 md:py-16">
        {/* Mobile-only compact header — hidden on desktop where the left column takes over */}
        <div className="mb-6 text-center lg:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            The Unfiltered{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              JoSAA Predictor
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get your Safe, Target &amp; Dream colleges — no account needed.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">

          {/* ── Left column: copy — desktop only ── */}
          <div className="hidden lg:flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              JoSAA 2024 · Demo data · No login required
            </span>

            <div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-tight">
                The Unfiltered{" "}
                <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                  JoSAA Predictor
                </span>
              </h1>
              <p className="mt-4 text-pretty text-lg text-muted-foreground">
                Get your{" "}
                <strong className="font-semibold text-foreground">Safe</strong>,{" "}
                <strong className="font-semibold text-foreground">Target</strong>, and{" "}
                <strong className="font-semibold text-foreground">Dream</strong>{" "}
                colleges instantly — no account needed.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted-foreground">
              Predictions are served by the Go backend using in-memory SQLite for fast queries.
            </p>
          </div>

          {/* ── Right column: form ── */}
          <div>
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm lg:p-7">
              <HomeForm />
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
