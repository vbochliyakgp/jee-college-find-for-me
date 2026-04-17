import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container flex max-w-[1400px] flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Cutoff data for exploration (not official counseling advice). PwD, B.Arch, and B.Planning support is not available yet.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Go to Main Page
          </Link>
        </div>
      </div>
    </footer>
  )
}
