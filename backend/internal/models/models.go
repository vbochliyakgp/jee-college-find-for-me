package models

type Gender string

const (
	// GenderNeutral is the canonical neutral pool label stored in DB/API.
	GenderNeutral Gender = "Neutral"
	// GenderFemale is the canonical female pool label stored in DB/API.
	GenderFemale Gender = "Female"
)

type ExamType string

const (
	// ExamTypeJEEMain maps to JoSAA non-IIT counseling rows.
	ExamTypeJEEMain ExamType = "jee-main"
	// ExamTypeJEEAdvanced maps to IIT counseling rows.
	ExamTypeJEEAdvanced ExamType = "jee-advanced"
)

// CutoffRow is the normalized row shape produced by the CSV importer and stored in SQLite.
type CutoffRow struct {
	ID            int64   `json:"id,omitempty"`   // Surrogate DB primary key.
	ExamType      string  `json:"exam_type"`      // Canonical exam bucket: jee-main or jee-advanced.
	Institute     string  `json:"institute"`      // Institute name from normalized JoSAA data.
	Department    string  `json:"department"`     // Program/branch name.
	InstituteType string  `json:"institute_type"` // IIT/NIT/IIIT/GFTI bucket.
	State         string  `json:"state"`          // Institute state used for HS/OS display and filters.
	NIRF          *string `json:"NIRF"`           // Optional NIRF rank text if available.
	Quota         string  `json:"quota"`          // AI/HS/OS/GO/JK/LA quota label.
	Gender        string  `json:"gender"`         // Canonical pool: Neutral or Female.
	SeatType      string  `json:"seat_type"`      // Seat bucket like OPEN/OBC-NCL/OPEN (PwD), etc.
	OpeningRank   int     `json:"opening_rank"`   // Opening rank for the row's seat pool.
	ClosingRank   int     `json:"closing_rank"`   // Closing rank for the row's seat pool.
}
