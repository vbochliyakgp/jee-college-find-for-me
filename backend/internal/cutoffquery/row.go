package cutoffquery

// ResultRow is one cutoff row returned for a pool tab (no DB surrogate id).
type ResultRow struct {
	ExamType      string  `json:"exam_type"`
	Institute     string  `json:"institute"`
	Department    string  `json:"department"`
	InstituteType string  `json:"institute_type"`
	State         string  `json:"state"`
	NIRF          *string `json:"NIRF,omitempty"`
	Quota         string  `json:"quota"`
	Gender        string  `json:"gender"`
	SeatType      string  `json:"seat_type"`
	OpeningRank   int     `json:"opening_rank"`
	ClosingRank   int     `json:"closing_rank"`
}
