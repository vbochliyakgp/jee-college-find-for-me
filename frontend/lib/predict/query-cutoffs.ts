import type { CollegeCutoffRow, ExamType, GroupedCollege } from "./types"

function rowKey(r: CollegeCutoffRow) {
  return `${r.institute}|${r.department}|${r.quota}|${r.gender}|${r.seat_type}|${r.opening_rank}|${r.closing_rank}`
}

function dedupe(rows: CollegeCutoffRow[]) {
  const seen = new Set<string>()
  const out: CollegeCutoffRow[] = []
  for (const r of rows) {
    const k = rowKey(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function isJeeMainEligible(row: CollegeCutoffRow) {
  if (row.institute_type === "IIT") return false
  if (row.institute.toLowerCase().includes("indian institute of technology")) return false
  return true
}

function isJeeAdvancedEligible(row: CollegeCutoffRow) {
  return row.institute_type === "IIT"
}

function categorySeatType(category: string, isPWD: boolean): string {
  const generalSeatType = isPWD ? "OPEN (PwD)" : "OPEN"
  switch (category) {
    case "General":
      return generalSeatType
    case "OBC":
      return isPWD ? "OBC-NCL (PwD)" : "OBC-NCL"
    case "SC":
      return isPWD ? "SC (PwD)" : "SC"
    case "ST":
      return isPWD ? "ST (PwD)" : "ST"
    case "EWS":
      return isPWD ? "EWS (PwD)" : "EWS"
    default:
      return generalSeatType
  }
}

export function groupAndSortColleges(collegeData: CollegeCutoffRow[]): GroupedCollege[] {
  const groupedByInstitute: Record<string, GroupedCollege> = {}

  for (const college of collegeData) {
    if (!groupedByInstitute[college.institute]) {
      groupedByInstitute[college.institute] = {
        institute: college.institute,
        institute_type: college.institute_type,
        state: college.state,
        NIRF: college.NIRF,
        departments: [],
      }
    }

    groupedByInstitute[college.institute].departments.push({
      department: college.department,
      opening_rank: college.opening_rank,
      closing_rank: college.closing_rank,
      quota: college.quota,
      gender: college.gender,
      seat_type: college.seat_type,
    })
  }

  const result = Object.values(groupedByInstitute)

  for (const institute of result) {
    institute.departments.sort((a, b) => {
      const deptCompare = a.department.localeCompare(b.department)
      if (deptCompare !== 0) return deptCompare
      if (a.gender !== b.gender) {
        return a.gender === "Female" ? -1 : 1
      }
      return a.quota === "HS" ? -1 : 1
    })
  }

  return result.sort((a, b) => {
    if (!a.NIRF && !b.NIRF) return 0
    if (!a.NIRF) return 1
    if (!b.NIRF) return -1
    const nirfA = Number.parseInt(String(a.NIRF), 10)
    const nirfB = Number.parseInt(String(b.NIRF), 10)
    if (Number.isNaN(nirfA) && Number.isNaN(nirfB)) return 0
    if (Number.isNaN(nirfA)) return 1
    if (Number.isNaN(nirfB)) return -1
    return nirfA - nirfB
  })
}

export interface PredictQueryParams {
  rank: number
  categoryRank: number | null
  category: string
  isPWD: boolean
  gender: "gender-neutral" | "female"
  homeState: string
  examType: ExamType
  allRows: CollegeCutoffRow[]
}

export function queryCutoffsForRank(params: PredictQueryParams): GroupedCollege[] {
  const { rank, categoryRank, category, isPWD, gender, homeState, examType, allRows } = params

  const categorySeatTypeVal = categorySeatType(category, isPWD)
  const gendersToFetch = gender === "female" ? ["Neutral", "Female"] : ["Neutral"]

  let allCollegeData: CollegeCutoffRow[] = []

  const baseFilter = (row: CollegeCutoffRow) =>
    examType === "jee-advanced" ? isJeeAdvancedEligible(row) : isJeeMainEligible(row)

  for (const genderToFetch of gendersToFetch) {
    const os = allRows.filter(
      (row) =>
        baseFilter(row) &&
        row.seat_type === "OPEN" &&
        row.gender === genderToFetch &&
        row.closing_rank >= rank &&
        row.quota === "OS",
    )
    const hs = allRows.filter(
      (row) =>
        baseFilter(row) &&
        row.seat_type === "OPEN" &&
        row.gender === genderToFetch &&
        row.closing_rank >= rank &&
        row.quota === "HS" &&
        row.state === homeState,
    )
    allCollegeData = allCollegeData.concat(os, hs)
  }

  if (isPWD || category !== "General") {
    const rankToUse = categoryRank !== null ? categoryRank : rank
    for (const genderToFetch of gendersToFetch) {
      const catOs = allRows.filter(
        (row) =>
          baseFilter(row) &&
          row.seat_type === categorySeatTypeVal &&
          row.gender === genderToFetch &&
          row.closing_rank >= rankToUse &&
          row.quota === "OS",
      )
      const catHs = allRows.filter(
        (row) =>
          baseFilter(row) &&
          row.seat_type === categorySeatTypeVal &&
          row.gender === genderToFetch &&
          row.closing_rank >= rankToUse &&
          row.quota === "HS" &&
          row.state === homeState,
      )
      allCollegeData = allCollegeData.concat(catOs, catHs)
    }
  }

  allCollegeData = dedupe(allCollegeData)
  return groupAndSortColleges(allCollegeData)
}
