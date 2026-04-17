export type Gender = "gender-neutral" | "female"

export type IndianState =
  | "Andhra Pradesh"
  | "Arunachal Pradesh"
  | "Assam"
  | "Bihar"
  | "Chhattisgarh"
  | "Goa"
  | "Gujarat"
  | "Haryana"
  | "Himachal Pradesh"
  | "Jharkhand"
  | "Karnataka"
  | "Kerala"
  | "Madhya Pradesh"
  | "Maharashtra"
  | "Manipur"
  | "Meghalaya"
  | "Mizoram"
  | "Nagaland"
  | "Odisha"
  | "Punjab"
  | "Rajasthan"
  | "Sikkim"
  | "Tamil Nadu"
  | "Telangana"
  | "Tripura"
  | "Uttar Pradesh"
  | "Uttarakhand"
  | "West Bengal"
  | "Andaman and Nicobar Islands"
  | "Chandigarh"
  | "Dadra and Nagar Haveli and Daman and Diu"
  | "Delhi"
  | "Jammu and Kashmir"
  | "Ladakh"
  | "Lakshadweep"
  | "Puducherry"

export type ExamType = "jee-main" | "jee-advanced"

export interface CollegeCutoffRow {
  institute: string
  department: string
  opening_rank: number
  closing_rank: number
  institute_type: string
  state: string
  NIRF: string | null
  quota: string
  gender: string
  seat_type: string
}

export interface GroupedCollege {
  institute: string
  institute_type: string
  state: string
  NIRF: string | null
  departments: {
    department: string
    opening_rank: number
    closing_rank: number
    general_closing_rank?: number
    female_closing_rank?: number
    quota: string
    gender: string
    seat_type: string
    chance?: "dream" | "easy"
    used_rank?: number
    rank_type?: "general" | "category"
    used_category?: boolean
    used_pwd?: boolean
    used_home_state?: boolean
  }[]
}

export interface PredictApiResponse {
  resolvedRank: number
  resolvedCategoryRank: number | null
  resolvedPwdRank?: number | null
  colleges: GroupedCollege[]
  count: number
}
