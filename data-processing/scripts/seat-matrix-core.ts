/**
 * Shared JoSAA-style seat matrix parsing (tab-separated blocks).
 * Used by parse-*-seat-matrix.ts in this folder (not run directly).
 */

export const SEAT_KEYS = [
  "OPEN",
  "OPEN_PWD",
  "GEN_EWS",
  "GEN_EWS_PWD",
  "SC",
  "SC_PWD",
  "ST",
  "ST_PWD",
  "OBC_NCL",
  "OBC_NCL_PWD",
] as const

export type SeatKey = (typeof SEAT_KEYS)[number]

export function parseSeatNumbers(cells: string[], valueStartIndex: number) {
  const seats: Record<SeatKey, number> = {
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
  }
  for (let k = 0; k < SEAT_KEYS.length; k++) {
    const raw = cells[valueStartIndex + k]?.trim() ?? "0"
    seats[SEAT_KEYS[k]] = Number.parseInt(raw, 10) || 0
  }
  const rowTotalRaw = cells[valueStartIndex + SEAT_KEYS.length]?.trim() ?? "0"
  const rowTotal = Number.parseInt(rowTotalRaw, 10) || 0
  return { seats, rowTotal }
}

export type Pool = {
  pool: string
  seats: Record<SeatKey, number>
  rowTotal: number
  programTotal?: number
  femaleSupernumerarySeats?: number
  supernumeraryNote?: string
}

export type ProgramRecord = {
  institute: string
  program: string
  seatScope: string
  pools: Pool[]
}

/** Main data row: institute + program + quota + Gender-Neutral + 11 numeric columns. */
export function isGenderNeutralMainRow(cells: string[]): boolean {
  if (cells.length < 15) return false
  const c0 = cells[0]?.trim() ?? ""
  const c3 = cells[3]?.trim() ?? ""
  if (c3 !== "Gender-Neutral") return false
  if (!c0) return false
  if (c0 === "Institute Name") return false
  return true
}

export function parseProgramsFromLines(lines: string[]): ProgramRecord[] {
  const programs: ProgramRecord[] = []

  for (let i = 0; i < lines.length; i++) {
    const main = lines[i].split("\t")
    if (!isGenderNeutralMainRow(main)) continue

    const institute = main[0].trim()
    const program = main[1].trim()
    const seatScope = main[2].trim()
    const genderNeutralPoolLabel = main[3].trim()
    const gn = parseSeatNumbers(main, 4)

    i++
    const capParts = lines[i]?.split("\t") ?? []
    const programTotal = Number.parseInt(capParts[0]?.trim() ?? "0", 10) || 0
    const femaleSupernumerarySeats = Number.parseInt(capParts[1]?.trim() ?? "0", 10) || 0

    i++
    const femLine = lines[i] ?? ""
    if (!femLine.startsWith("Female-only")) {
      console.warn(`Expected Female-only row after line ${i + 1}, got: ${femLine.slice(0, 60)}`)
      continue
    }
    const femCells = femLine.split("\t")
    const femalePoolLabel = femCells[0].trim()
    const fo = parseSeatNumbers(femCells, 1)

    i++
    const noteLine = (lines[i] ?? "").trim()
    const supernumeraryNote = noteLine.startsWith("(including") ? noteLine : undefined

    programs.push({
      institute,
      program,
      seatScope,
      pools: [
        {
          pool: genderNeutralPoolLabel,
          seats: gn.seats,
          rowTotal: gn.rowTotal,
          programTotal,
          femaleSupernumerarySeats,
        },
        {
          pool: femalePoolLabel,
          seats: fo.seats,
          rowTotal: fo.rowTotal,
          ...(supernumeraryNote ? { supernumeraryNote } : {}),
        },
      ],
    })
  }

  return programs
}

export type GrandTotalsGenderNeutral = {
  label: string
  seats: Record<SeatKey, number>
  rowTotal: number
  programTotal: number
  femaleSupernumerarySeats: number
}

export type GrandTotals = {
  sourceNote: string
  genderNeutral: GrandTotalsGenderNeutral
}

/** Find footer row containing a cell exactly `Total Seats` and the following capacity line. */
export function parseGrandTotalsFromFooter(
  lines: string[],
  sourceNote: string,
): GrandTotals | undefined {
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 12); i--) {
    const cells = lines[i]?.split("\t") ?? []
    const totalIdx = cells.findIndex((c) => c.trim() === "Total Seats")
    if (totalIdx < 0) continue
    if (totalIdx + 1 + SEAT_KEYS.length >= cells.length) continue

    const gn = parseSeatNumbers(cells, totalIdx + 1)
    const nextLine = lines[i + 1]
    if (!nextLine?.trim()) continue
    const capParts = nextLine.split("\t")
    const programTotal = Number.parseInt(capParts[0]?.trim() ?? "0", 10) || 0
    const femaleSupernumerarySeats = Number.parseInt(capParts[1]?.trim() ?? "0", 10) || 0

    return {
      sourceNote,
      genderNeutral: {
        label: "Total Seats",
        seats: gn.seats,
        rowTotal: gn.rowTotal,
        programTotal,
        femaleSupernumerarySeats,
      },
    }
  }
  return undefined
}
