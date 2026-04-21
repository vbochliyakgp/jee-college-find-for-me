import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 max-w-[1400px] items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-[1.04]">
            JC
          </span>
          <span className="hidden sm:inline text-foreground">JEE College Find</span>
        </Link>

        <div className="hidden sm:inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wide text-primary">
          JoSAA cutoff search
        </div>
      </div>
    </header>
  )
}
