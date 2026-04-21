import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container flex max-w-[1400px] flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Cutoff data is shown for guidance only (not official counseling advice). B.Arch, B.Planning, and IIT preparatory
          course support is currently unavailable.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Go to Main Page
          </Link>
          <Link href="/how-to-use" className="hover:text-foreground">
            How to use
          </Link>
        </div>
      </div>
    </footer>
  )
}
