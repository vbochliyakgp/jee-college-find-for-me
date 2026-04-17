/**
 * Parses data/seat-matix/nits.txt → data/seat-matix/nits.json
 * Run from repo `data-processing/`: bun run parse:nits
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  parseGrandTotalsFromFooter,
  parseProgramsFromLines,
} from "./seat-matrix-core"

const __dirname = dirname(fileURLToPath(import.meta.url))

const root = join(__dirname, "..")
const inputPath = join(root, "data/seat-matix/nits.txt")
const outputPath = join(root, "data/seat-matix/nits.json")

const text = readFileSync(inputPath, "utf8")
const lines = text.split(/\r?\n/)
const programs = parseProgramsFromLines(lines)

const grandTotals =
  parseGrandTotalsFromFooter(lines, "nits.txt footer (Total Seats row)") ?? {
    sourceNote: "not found in file",
    genderNeutral: {
      label: "Total Seats",
      seats: {
        OPEN: 0,
        OPEN_PWD: 0,
        GEN_EWS: 0,
        GEN_EWS_PWD: 0,
        SC: 0,
        SC_PWD: 0,
        ST: 0,
        ST_PWD: 0,
        OBC_NCL: 0,
        OBC_NCL_PWD: 0,
      },
      rowTotal: 0,
      programTotal: 0,
      femaleSupernumerarySeats: 0,
    },
  }

const out = {
  source: "nits.txt",
  description:
    "NIT+ (JoSAA) seat matrix: institute, program, home-state / other-state quota (e.g. PUNJAB vs Other than PUNJAB), Gender-Neutral and Female-only pools. Includes IIEST Shibpur and similar institutes in the same table.",
  programCount: programs.length,
  grandTotals,
  programs,
}

writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`, "utf8")
console.log(`Wrote ${programs.length} programs → ${outputPath}`)
