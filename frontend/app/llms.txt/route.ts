export const revalidate = 3600

export async function GET() {
  const content = [
    "# JEE College Find",
    "",
    "> JoSAA-style cutoff row search for planning.",
    "",
    "## Access",
    "- Free to use.",
    "- No signup required.",
    "- No email required.",
    "- No phone number required.",
    "",
    "## Scope",
    "- Supports JEE Main and JEE Advanced cutoff snapshots.",
    "- Uses exam, gender pool, category, PwD, home state, institute types, and closing-rank bands.",
    "- Not official JoSAA counseling advice.",
    "",
    "## URLs",
    "- Home: /",
    "- Results (session): /results",
    "- Sitemap: /sitemap.xml",
  ].join("\n")

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
