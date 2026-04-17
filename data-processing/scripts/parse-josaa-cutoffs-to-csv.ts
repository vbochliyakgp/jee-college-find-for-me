/**
 * JoSAA opening/closing rank export (tab-separated .txt) → CSV.
 * Default: data/cutoffs/6.txt → data/cutoffs/round-6-cutoffs.csv
 * Rounds 1–5: pass `data/cutoffs/N.txt` and `data/cutoffs/round-N-cutoffs.csv` (see package.json).
 *
 * Run from repo `data-processing/`: bun run parse:cutoffs:round6
 *      bun scripts/parse-josaa-cutoffs-to-csv.ts data/cutoffs/in.txt data/cutoffs/out.csv
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const defaultIn = join(root, "data/cutoffs/6.txt")
const defaultOut = join(root, "data/cutoffs/round-6-cutoffs.csv")

const inputPath = process.argv[2] ?? defaultIn
const outputPath = process.argv[3] ?? defaultOut

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowToCsv(cells: string[]): string {
  return cells.map(csvEscape).join(",")
}

function extractAcademicYear(preamble: string): string {
  const m = preamble.match(/Academic Year\s+(\d{4}-\d{2})/i)
  return m?.[1] ?? ""
}

const raw = readFileSync(inputPath, "utf8")
const lines = raw.split(/\r?\n/)

let headerLineIndex = lines.findIndex(
  (l) => l.startsWith("Institute\t") && l.includes("Opening Rank"),
)
if (headerLineIndex < 0) {
  console.error("Could not find header row (Institute … Opening Rank).")
  process.exit(1)
}

const preamble = lines.slice(0, headerLineIndex).join("\n")
const academicYear = extractAcademicYear(preamble)
const roundMatch = inputPath.match(/(\d+)\.txt$/)
const josaaRound = roundMatch?.[1] ?? ""

const headerCells = [
  "josaa_round",
  "academic_year",
  "institute",
  "academic_program_name",
  "quota",
  "seat_type",
  "gender",
  "opening_rank",
  "closing_rank",
]

const outLines: string[] = [rowToCsv(headerCells)]
let skipped = 0

for (let i = headerLineIndex + 1; i < lines.length; i++) {
  const line = lines[i]
  if (!line.trim()) continue

  const parts = line.split("\t").map((s) => s.trimEnd().trim())
  if (parts.length < 7) {
    skipped++
    continue
  }

  let institute: string
  let program: string
  let quota: string
  let seatType: string
  let gender: string
  let opening: string
  let closing: string

  if (parts.length === 7) {
    ;[institute, program, quota, seatType, gender, opening, closing] = parts
  } else {
    institute = parts[0] ?? ""
    closing = parts[parts.length - 1] ?? ""
    opening = parts[parts.length - 2] ?? ""
    gender = parts[parts.length - 3] ?? ""
    seatType = parts[parts.length - 4] ?? ""
    quota = parts[parts.length - 5] ?? ""
    program = parts.slice(1, parts.length - 5).join(" ").trim()
  }

  outLines.push(
    rowToCsv([
      josaaRound,
      academicYear,
      institute,
      program,
      quota,
      seatType,
      gender,
      opening.replace(/\s+/g, ""),
      closing.replace(/\s+/g, ""),
    ]),
  )
}

writeFileSync(outputPath, `${outLines.join("\n")}\n`, "utf8")
console.log(
  `Wrote ${outLines.length - 1} data rows → ${outputPath}` +
    (skipped ? ` (${skipped} short lines skipped)` : "") +
    (academicYear ? ` [academic_year=${academicYear}]` : ""),
)
