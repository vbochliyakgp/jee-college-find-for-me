export const revalidate = 3600

export async function GET() {
  const content = [
    "# JEE College Find",
    "",
    "> Free JEE college predictor for planning.",
    "",
    "## Access",
    "- Free to use.",
    "- No signup required.",
    "- No email required.",
    "- No phone number required.",
    "",
    "## Scope",
    "- Supports JEE Main and JEE Advanced prediction flows.",
    "- Uses rank, category, gender, and quota-related inputs.",
    "- Not official JoSAA counseling advice.",
    "",
    "## URLs",
    "- Home: /",
    "- Predict: /predict",
    "- Sitemap: /sitemap.xml",
  ].join("\n")

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
