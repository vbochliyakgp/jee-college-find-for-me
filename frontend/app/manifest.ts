import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JEE College Find",
    short_name: "JCF",
    description: "JoSAA-style cutoff search for JEE Main and JEE Advanced.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    lang: "en-IN",
    categories: ["education", "utilities"],
  }
}
