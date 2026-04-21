package cutoffquery

import (
	"context"
	"testing"

	"jee-college-find-for-me/complete-stack/backend/internal/db"
)

func TestQueryCutoffPool_smoke(t *testing.T) {
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	_, err = database.ExecContext(ctx, `
INSERT INTO cutoff_rows (exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank)
VALUES ('jee-main', 'Test NIT', 'CSE', 'NIT', 'TestState', NULL, 'AI', 'Neutral', 'OPEN', 1, 5000)
`)
	if err != nil {
		t.Fatal(err)
	}

	rows, err := QueryCutoffPool(ctx, database, PoolQueryInput{
		Table:          DefaultCutoffTable,
		ExamType:       "jee-main",
		GenderDB:       "Neutral",
		Quotas:         []string{"AI", "OS"},
		InstituteTypes: []string{"NIT"},
		SeatTypes:      []string{"OPEN"},
		ClosingRankBands: []ClosingRankBand{
			{TargetPool: "open", ClosingRankMin: ptrI(100), ClosingRankMax: ptrI(10000)},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("want 1 row, got %d", len(rows))
	}
	if rows[0].ClosingRank != 5000 {
		t.Fatalf("closing rank: %d", rows[0].ClosingRank)
	}
}

func ptrI(n int) *int { return &n }
