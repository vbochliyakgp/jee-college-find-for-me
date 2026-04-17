/**
 * Parses data/seat-matix/iits.txt → data/seat-matix/iits.json
 * Run from repo `data-processing/`: bun run parse:iits
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  type GrandTotals,
  parseProgramsFromLines,
  type SeatKey,
  SEAT_KEYS,
} from "./seat-matrix-core"

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Footer from `iits.html` (~lines 1216–1217): All-IIT Gender-Neutral “Total Seats” + capacity row. */
const GRAND_TOTALS_FROM_IITS_HTML: GrandTotals = {
  sourceNote: "iits.html footer (Total Seats row, tab-separated)",
  genderNeutral: {
    label: "Total Seats",
    seats: {
      OPEN: 7025,
      OPEN_PWD: 339,
      GEN_EWS: 1727,
      GEN_EWS_PWD: 87,
      SC: 2586,
      SC_PWD: 138,
      ST: 1300,
      ST_PWD: 64,
      OBC_NCL: 4656,
      OBC_NCL_PWD: 238,
    } satisfies Record<SeatKey, number>,
    rowTotal: 18160,
    programTotal: 16562,
    femaleSupernumerarySeats: 1598,
  },
}

const root = join(__dirname, "..")
const inputPath = join(root, "data/seat-matix/iits.txt")
const outputPath = join(root, "data/seat-matix/iits.json")

const text = readFileSync(inputPath, "utf8")
const lines = text.split(/\r?\n/)
const programs = parseProgramsFromLines(lines)

const out = {
  source: "iits.txt",
  description:
    "IIT seat matrix: institute, program, All India quota, Gender-Neutral vs Female-only pools with category-wise seats.",
  programCount: programs.length,
  grandTotals: GRAND_TOTALS_FROM_IITS_HTML,
  programs,
}

writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`, "utf8")
console.log(`Wrote ${programs.length} programs → ${outputPath}`)
