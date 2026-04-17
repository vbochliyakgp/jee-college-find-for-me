/**
 * Reads JOSAA CSV from data-processing and writes client-bundled JSON for the demo predictor.
 * Run from repo root: node new/scripts/build-cutoffs-demo.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "../..")
const csvPath = path.join(repoRoot, "data-processing/data/cutoffs/round-6-cutoffs.csv")
const outPath = path.join(__dirname, "../lib/data/cutoffs-demo.json")

const CITY_TO_STATE = {
  Jalandhar: "Punjab",
  Warangal: "Telangana",
  Trichy: "Tamil Nadu",
  Tiruchirappalli: "Tamil Nadu",
  Surathkal: "Karnataka",
  Calicut: "Kerala",
  Hamirpur: "Himachal Pradesh",
  Jaipur: "Rajasthan",
  Kurukshetra: "Haryana",
  Silchar: "Assam",
  Patna: "Bihar",
  Raipur: "Chhattisgarh",
  Rourkela: "Odisha",
  Agartala: "Tripura",
  Goa: "Goa",
  Srinagar: "Jammu and Kashmir",
  Delhi: "Delhi",
  "New Delhi": "Delhi",
  Bhopal: "Madhya Pradesh",
  Nagpur: "Maharashtra",
  Puducherry: "Puducherry",
  "Andhra Pradesh": "Andhra Pradesh",
  "Arunachal Pradesh": "Arunachal Pradesh",
  Sikkim: "Sikkim",
  Uttarakhand: "Uttarakhand",
  Manipur: "Manipur",
  Mizoram: "Mizoram",
  Meghalaya: "Meghalaya",
}

const IIT_CAMPUS_TO_STATE = {
  Bombay: "Maharashtra",
  Delhi: "Delhi",
  Madras: "Tamil Nadu",
  Kanpur: "Uttar Pradesh",
  Kharagpur: "West Bengal",
  Roorkee: "Uttarakhand",
  Guwahati: "Assam",
  Hyderabad: "Telangana",
  Mandi: "Himachal Pradesh",
  Patna: "Bihar",
  Bhubaneswar: "Odisha",
  Gandhinagar: "Gujarat",
  Jodhpur: "Rajasthan",
  Ropar: "Punjab",
  Indore: "Madhya Pradesh",
  Varanasi: "Uttar Pradesh",
  Palakkad: "Kerala",
  Tirupati: "Andhra Pradesh",
  Dhanbad: "Jharkhand",
  Bhilai: "Chhattisgarh",
  Goa: "Goa",
  Jammu: "Jammu and Kashmir",
}

function parseCSVLine(line) {
  const result = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (c === "," && !inQuotes) {
      result.push(cur)
      cur = ""
      continue
    }
    cur += c
  }
  result.push(cur)
  return result
}

function instituteType(name) {
  if (name.includes("Indian Institute of Information Technology")) return "IIIT"
  if (name.includes("Indian Institute of Technology")) return "IIT"
  if (name.includes("National Institute of Technology")) return "NIT"
  return "GFTI"
}

function inferState(institute) {
  const nitMatch = institute.match(/National Institute of Technology,?\s*(.+)$/i)
  if (nitMatch) {
    const city = nitMatch[1].trim()
    if (CITY_TO_STATE[city]) return CITY_TO_STATE[city]
  }
  const iitMatch = institute.match(/Indian Institute of Technology\s+([^\s,]+)\s*$/i)
  if (iitMatch) {
    const campus = iitMatch[1].trim()
    if (IIT_CAMPUS_TO_STATE[campus]) return IIT_CAMPUS_TO_STATE[campus]
  }
  for (const [city, st] of Object.entries(CITY_TO_STATE)) {
    if (institute.includes(city)) return st
  }
  return "India"
}

function normalizeGender(g) {
  if (g.startsWith("Female")) return "Female"
  return "Neutral"
}

function normalizeQuota(q) {
  if (q === "HS") return "HS"
  return "OS"
}

function main() {
  const raw = fs.readFileSync(csvPath, "utf8")
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const header = lines[0]
  if (!header.includes("opening_rank")) {
    console.error("Unexpected CSV header")
    process.exit(1)
  }

  const out = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 9) continue
    const [, , institute, program, quota, seatType, gender, openStr, closeStr] = cols
    if (!/^\d+$/.test(openStr) || !/^\d+$/.test(closeStr)) continue
    const opening_rank = Number.parseInt(openStr, 10)
    const closing_rank = Number.parseInt(closeStr, 10)
    const q = normalizeQuota(quota)
    out.push({
      institute,
      department: program,
      opening_rank,
      closing_rank,
      institute_type: instituteType(institute),
      state: inferState(institute),
      NIRF: null,
      quota: q,
      gender: normalizeGender(gender),
      seat_type: seatType,
    })
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(out))
  console.log(`Wrote ${out.length} rows to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`)
}

main()
