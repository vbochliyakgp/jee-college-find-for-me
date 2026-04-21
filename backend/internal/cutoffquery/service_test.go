package cutoffquery

import (
	"context"
	"testing"

	"jee-college-find-for-me/complete-stack/backend/internal/db"
)

func TestServiceQueryPools_skipsIneligiblePoolWhenUnvalidated(t *testing.T) {
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	_, err = database.ExecContext(ctx, `
INSERT INTO cutoff_rows (exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank)
VALUES ('jee-main', 'Test NIT', 'CSE', 'NIT', 'Bihar', NULL, 'AI', 'Neutral', 'OPEN', 1, 5000)
`)
	if err != nil {
		t.Fatal(err)
	}

	svc := NewService(database)
	req := Request{
		Version:        1,
		ExamType:       "jee-main",
		GenderPool:     "neutral",
		Category:       "General",
		IsPwd:          false,
		Quotas:         []string{"AI", "OS"},
		InstituteTypes: []string{"NIT"},
		PowerMode: PowerMode{
			Combine: "union",
			ClosingRankBands: []ClosingRankBand{
				{TargetPool: "open", ClosingRankMin: ptrS(1), ClosingRankMax: ptrS(10000)},
				// Invalid for General, but service should skip instead of failing.
				{TargetPool: "category", ClosingRankMin: ptrS(1), ClosingRankMax: ptrS(10000)},
			},
		},
	}

	resp, err := svc.QueryPools(ctx, req)
	if err != nil {
		t.Fatalf("expected service to skip ineligible pool, got error: %v", err)
	}
	if got := len(resp.Pools.Open); got != 1 {
		t.Fatalf("expected open pool row, got %d", got)
	}
	if got := len(resp.Pools.Category); got != 0 {
		t.Fatalf("expected skipped category pool to be empty, got %d", got)
	}
}

func TestServiceQueryPools_femaleIncludesNeutralAndFemaleRows(t *testing.T) {
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	_, err = database.ExecContext(ctx, `
INSERT INTO cutoff_rows (exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank) VALUES
  ('jee-main', 'Test NIT', 'CSE', 'NIT', 'Bihar', NULL, 'AI', 'Neutral', 'OPEN', 1, 5000),
  ('jee-main', 'Test NIT', 'CSE', 'NIT', 'Bihar', NULL, 'AI', 'Female', 'OPEN', 1, 7000)
`)
	if err != nil {
		t.Fatal(err)
	}

	svc := NewService(database)
	req := Request{
		Version:        1,
		ExamType:       "jee-main",
		GenderPool:     "female",
		Category:       "General",
		IsPwd:          false,
		Quotas:         []string{"AI", "OS"},
		InstituteTypes: []string{"NIT"},
		PowerMode: PowerMode{
			Combine: "union",
			ClosingRankBands: []ClosingRankBand{
				{TargetPool: "open", ClosingRankMin: ptrS(1), ClosingRankMax: ptrS(10000)},
			},
		},
	}

	resp, err := svc.QueryPools(ctx, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := len(resp.Pools.Open); got != 2 {
		t.Fatalf("female pool should include neutral+female rows, got %d", got)
	}
}

func ptrS(v int) *int { return &v }
