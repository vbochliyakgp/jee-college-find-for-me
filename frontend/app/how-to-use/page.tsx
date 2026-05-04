import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "How to use",
  description: "Quick guide for students: what each field means and how to search cutoffs confidently.",
  alternates: { canonical: "/how-to-use" },
}

const steps = [
  {
    title: "1) Choose counseling mode",
    text: "Select JoSAA (for IITs/NITs/IIITs/GFTIs using category rank) or CSAB (for NITs/IIITs/GFTIs vacant seats using CRL).",
  },
  {
    title: "2) Choose exam and gender",
    text: "Pick JEE Main or JEE Advanced. Then choose your gender pool.",
  },
  {
    title: "3) Choose category and PwD",
    text: "Select your category and PwD status exactly as applicable.",
  },
  {
    title: "4) Add home state (for JEE Main)",
    text: "Home state helps show state-wise quota cutoffs where relevant.",
  },
  {
    title: "5) Select institute types",
    text: "Choose IIT, NIT, IIIT, and/or GFTI based on what you want to explore.",
  },
  {
    title: "6) Set rank ranges",
    text: "Enter at least one number (Min or Max). For CSAB, you only need to enter your Common Rank List (CRL) rank.",
  },
  {
    title: "7) Search and compare",
    text: "Open results and switch tabs (Open, Category, Open PwD, Cat PwD) to compare options.",
  },
]

const fieldHelp = [
  ["Counseling", "JoSAA uses Category ranks for reserved categories; CSAB uses Common Rank List (CRL) for everything."],
  ["Exam", "Main for NIT/IIIT/GFTI style counseling, Advanced for IIT counseling."],
  ["Gender pool", "Controls which gender cutoff pool you want to see."],
  ["Category", "General, OBC, SC, ST, or EWS."],
  ["PwD", "Enable if you want PwD-based rows included."],
  ["Home state", "Used for state quota logic in JEE Main."],
  ["Institute type", "Which institute groups to include in your search."],
  ["Min / Max rank", "Your cutoff window. For CSAB, the 'Open' CRL rank you enter is automatically applied to all eligible category pools."],
]

export default function HowToUsePage() {
  return (
    <div className="container max-w-4xl py-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">How to use this site</h1>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        Quick student guide. Simple steps, no technical setup needed.
      </p>

      <section className="mt-6 space-y-3 rounded-xl border border-border/70 bg-card/60 p-4 md:p-6">
        {steps.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-semibold text-foreground md:text-base">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-border/70 bg-card/60 p-4 md:p-6">
        <h2 className="text-base font-semibold text-foreground md:text-lg">What each field means</h2>
        <div className="mt-3 grid gap-2">
          {fieldHelp.map(([name, desc]) => (
            <div key={name} className="grid gap-1 rounded-lg border border-border/60 p-3 md:grid-cols-[9rem_1fr] md:items-start">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">Use filters step by step and compare tabs to shortlist faster.</p>
    </div>
  )
}
