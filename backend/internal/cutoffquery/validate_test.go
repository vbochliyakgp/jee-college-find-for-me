package cutoffquery

import "testing"

func TestValidate_minimalOK_main(t *testing.T) {
	req := Request{
		Version:        1,
		ExamType:       "jee-main",
		GenderPool:     "neutral",
		Category:       "General",
		Quotas:         []string{"AI", "OS"},
		InstituteTypes: []string{"IIT", "NIT"},
		PowerMode: PowerMode{
			Combine: "union",
			ClosingRankBands: []ClosingRankBand{
				{TargetPool: "open", ClosingRankMin: ptr(1), ClosingRankMax: ptr(5000)},
			},
		},
	}
	if v := Validate(req); len(v) != 0 {
		t.Fatalf("expected no errors, got %v", v)
	}
}

func TestValidate_advanced_rejectsHomeState(t *testing.T) {
	home := "Karnataka"
	req := Request{
		Version:        1,
		ExamType:       "jee-advanced",
		GenderPool:     "neutral",
		Category:       "General",
		Quotas:         []string{"AI", "OS"},
		InstituteTypes: []string{"IIT"},
		HomeState:      &home,
		PowerMode: PowerMode{
			Combine: "union",
			ClosingRankBands: []ClosingRankBand{
				{TargetPool: "open", ClosingRankMin: ptr(1), ClosingRankMax: ptr(100)},
			},
		},
	}
	if v := Validate(req); len(v) == 0 {
		t.Fatal("expected errors")
	}
}

func TestValidate_categoryBand_general(t *testing.T) {
	req := Request{
		Version:        1,
		ExamType:       "jee-main",
		GenderPool:     "neutral",
		Category:       "General",
		Quotas:         []string{"AI", "OS"},
		InstituteTypes: []string{"IIT"},
		PowerMode: PowerMode{
			Combine: "union",
			ClosingRankBands: []ClosingRankBand{
				{TargetPool: "category", ClosingRankMin: ptr(1), ClosingRankMax: ptr(100)},
			},
		},
	}
	if v := Validate(req); len(v) == 0 {
		t.Fatal("expected errors for category band with General")
	}
}

func ptr(n int) *int { return &n }
