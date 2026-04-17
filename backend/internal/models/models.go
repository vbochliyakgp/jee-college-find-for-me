package models

type Gender string

const (
	// GenderNeutral is the canonical neutral pool label stored in DB/API.
	GenderNeutral Gender = "Neutral"
	// GenderFemale is the canonical female pool label stored in DB/API.
	GenderFemale  Gender = "Female"
)

type ExamType string

const (
	// ExamTypeJEEMain maps to JoSAA non-IIT counseling rows.
	ExamTypeJEEMain     ExamType = "jee-main"
	// ExamTypeJEEAdvanced maps to IIT counseling rows.
	ExamTypeJEEAdvanced ExamType = "jee-advanced"
)

// CutoffRow is the normalized DB row shape used during fetch/scoring.
type CutoffRow struct {
	ID            int64   `json:"id,omitempty"`   // Surrogate DB primary key.
	ExamType      string  `json:"exam_type"`      // Canonical exam bucket: jee-main or jee-advanced.
	Institute     string  `json:"institute"`      // Institute name from normalized JoSAA data.
	Department    string  `json:"department"`     // Program/branch name.
	InstituteType string  `json:"institute_type"` // IIT/NIT/IIIT/GFTI bucket.
	State         string  `json:"state"`          // Inferred institute state used for HS checks/display.
	NIRF          *string `json:"NIRF"`           // Optional NIRF rank text if available.
	Quota         string  `json:"quota"`          // AI/HS/OS quota label.
	Gender        string  `json:"gender"`         // Canonical pool: Neutral or Female.
	SeatType      string  `json:"seat_type"`      // Seat bucket like OPEN/OBC-NCL/OPEN (PwD), etc.
	OpeningRank   int     `json:"opening_rank"`   // Opening rank for the row's seat pool.
	ClosingRank   int     `json:"closing_rank"`   // Closing rank for the row's seat pool.
}

// GroupedDepartment is the branch-level response item sent to frontend.
type GroupedDepartment struct {
	Department         string `json:"department"`                    // Program/branch name.
	OpeningRank        int    `json:"opening_rank"`                  // Opening rank of selected row.
	ClosingRank        int    `json:"closing_rank"`                  // Closing rank of selected row (drives chance/order).
	GeneralClosingRank *int   `json:"general_closing_rank,omitempty"` // Neutral-pool closing rank for same institute+department, if present.
	FemaleClosingRank  *int   `json:"female_closing_rank,omitempty"`  // Female-pool closing rank for same institute+department, if present.
	Quota              string `json:"quota"`                         // Quota for selected row.
	Gender             string `json:"gender"`                        // Gender pool used by selected row.
	SeatType           string `json:"seat_type"`                     // Seat type for selected row.
	Chance             string `json:"chance"`                        // Classifier output: dream or easy.
	UsedRank           int    `json:"used_rank"`                     // Rank value actually used for scoring (reserved for future logic).
	RankType           string `json:"rank_type"`                     // Which rank type was used: general/category (reserved).
	UsedCategory       bool   `json:"used_category"`                 // Whether category benefit was applied (reserved).
	UsedPWD            bool   `json:"used_pwd"`                      // Whether PwD benefit was applied (reserved).
	UsedHomeState      bool   `json:"used_home_state"`               // Whether home-state benefit was applied (reserved).
}

// GroupedCollege is the UI card/group wrapper. Current flow keeps one department per item.
type GroupedCollege struct {
	Institute     string              `json:"institute"`      // Institute display name.
	InstituteType string              `json:"institute_type"` // IIT/NIT/IIIT/GFTI bucket.
	State         string              `json:"state"`          // Institute state.
	NIRF          *string             `json:"NIRF"`           // Optional NIRF rank text.
	Departments   []GroupedDepartment `json:"departments"`    // Branch rows for this institute card.
}

// PredictRequest is the API payload accepted by POST /api/predict.
type PredictRequest struct {
	ExamType     string  `json:"examType"` // jee-main or jee-advanced.
	Score        string  `json:"score"`    // Legacy rank input alias kept for client compatibility.
	Rank         string  `json:"rank"` // CRL; same meaning as score (new clients send rank)
	Category     string  `json:"category"`     // General/OBC/SC/ST/EWS.
	CategoryRank *string `json:"categoryRank"` // Optional category rank string.
	IsPWD        bool    `json:"isPWD"`        // Whether candidate is PwD.
	// PwdRank: when category is General → JoSAA OPEN-PwD rank (OPEN (PwD) seats).
	// When category is reserved → that category’s PwD rank (e.g. OBC-NCL-PwD); we use the same
	// value for OPEN (PwD) and for … (PwD) category seats (horizontal PwD, one field). Required when isPWD.
	PwdRank   *string `json:"pwdRank"`   // Optional PwD rank string.
	Gender    string  `json:"gender"`    // Input gender preference routing: female or neutral flow.
	HomeState string  `json:"homeState"` // Optional home state for HS logic (reserved for richer flow).
}

// PredictResponse is returned by POST /api/predict.
type PredictResponse struct {
	ResolvedRank         int              `json:"resolvedRank"`                  // Parsed rank used for prediction.
	ResolvedCategoryRank *int             `json:"resolvedCategoryRank"`          // Parsed category rank, when available.
	ResolvedPwdRank      *int             `json:"resolvedPwdRank,omitempty"`     // Parsed PwD rank, when available.
	Colleges             []GroupedCollege `json:"colleges"`                      // Ranked shortlist rows.
	Count                int              `json:"count"`                         // Number of returned shortlist rows.
}

// FiltersResponse returns distinct filter values available in cutoff_rows.
type FiltersResponse struct {
	States         []string `json:"states"`         // Distinct institute states.
	InstituteTypes []string `json:"instituteTypes"` // Distinct institute type buckets.
	Quotas         []string `json:"quotas"`         // Distinct quota values.
	SeatTypes      []string `json:"seatTypes"`      // Distinct seat type values.
	Genders        []string `json:"genders"`        // Distinct canonical genders.
}
