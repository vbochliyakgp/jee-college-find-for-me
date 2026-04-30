package cutoffquery

// JSON mirrors the frontend AdvancedCutoffQueryV1 contract.

type Request struct {
	Version          int            `json:"version"`
	Counseling       string         `json:"counseling"` // "josaa" or "csab"
	ExamType         string         `json:"examType"`
	GenderPool       string         `json:"genderPool"`
	Category         string         `json:"category"`
	IsPwd            bool           `json:"isPwd"`
	HomeState        *string        `json:"homeState,omitempty"`
	Quotas           []string       `json:"quotas"`
	InstituteTypes   []string       `json:"instituteTypes"`
	PowerMode        PowerMode      `json:"powerMode"`
	Pagination       *Pagination    `json:"pagination,omitempty"`
}

type PowerMode struct {
	Combine            string              `json:"combine"`
	ClosingRankBands   []ClosingRankBand   `json:"closingRankBands"`
}

type ClosingRankBand struct {
	TargetPool      string `json:"targetPool"`
	ClosingRankMin  *int   `json:"closingRankMin"`
	ClosingRankMax  *int   `json:"closingRankMax"`
}

type Pagination struct {
	TargetPool string `json:"targetPool"`
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
}
