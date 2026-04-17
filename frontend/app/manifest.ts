import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JEE College Find",
    short_name: "JCF",
    description: "JEE college predictor for JEE Main and JEE Advanced aspirants.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    lang: "en-IN",
    categories: ["education", "utilities"],
  }
}
