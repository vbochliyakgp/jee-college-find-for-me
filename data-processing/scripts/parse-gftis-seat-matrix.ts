/**
 * Parses data/seat-matix/gftis.txt → data/seat-matix/gftis.json
 * Run from repo `data-processing/`: bun run parse:gftis
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
const inputPath = join(root, "data/seat-matix/gftis.txt")
const outputPath = join(root, "data/seat-matix/gftis.json")

const text = readFileSync(inputPath, "utf8")
const lines = text.split(/\r?\n/)
const programs = parseProgramsFromLines(lines)

const grandTotals =
  parseGrandTotalsFromFooter(lines, "gftis.txt footer (Total Seats row)") ?? {
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
  source: "gftis.txt",
  description:
    "GFTI (JoSAA) seat matrix: government-funded technical institutes — institute, program, All India and/or home-state quota rows, Gender-Neutral and Female-only pools.",
  programCount: programs.length,
  grandTotals,
  programs,
}

writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`, "utf8")
console.log(`Wrote ${programs.length} programs → ${outputPath}`)
