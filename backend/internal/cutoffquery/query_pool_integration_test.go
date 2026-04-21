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

func TestQueryCutoffPool_homeStateHS_OS(t *testing.T) {
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	_, err = database.ExecContext(ctx, `
INSERT INTO cutoff_rows (exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank) VALUES
  ('jee-main', 'NIT Bihar', 'CSE', 'NIT', 'Bihar', NULL, 'HS', 'Neutral', 'OPEN', 1, 1000),
  ('jee-main', 'NIT Karnataka', 'CSE', 'NIT', 'Karnataka', NULL, 'HS', 'Neutral', 'OPEN', 1, 2000),
  ('jee-main', 'NIT Bihar', 'ECE', 'NIT', 'Bihar', NULL, 'OS', 'Neutral', 'OPEN', 1, 3000),
  ('jee-main', 'NIT Karnataka', 'ECE', 'NIT', 'Karnataka', NULL, 'OS', 'Neutral', 'OPEN', 1, 4000)
`)
	if err != nil {
		t.Fatal(err)
	}

	home := "Bihar"
	rows, err := QueryCutoffPool(ctx, database, PoolQueryInput{
		Table:            DefaultCutoffTable,
		ExamType:         "jee-main",
		GenderDB:         "Neutral",
		Quotas:           []string{"HS", "OS"},
		InstituteTypes:   []string{"NIT"},
		SeatTypes:        []string{"OPEN"},
		HomeState:        &home,
		ClosingRankBands: []ClosingRankBand{{TargetPool: "open", ClosingRankMin: ptrI(1), ClosingRankMax: ptrI(50000)}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 {
		t.Fatalf("want 2 rows (HS@Bihar + OS@non-home), got %d: %+v", len(rows), rows)
	}
	seenHSBihar := false
	seenOSKarnataka := false
	for _, r := range rows {
		switch {
		case r.Quota == "HS" && r.State == "Bihar" && r.ClosingRank == 1000:
			seenHSBihar = true
		case r.Quota == "OS" && r.State == "Karnataka" && r.ClosingRank == 4000:
			seenOSKarnataka = true
		}
	}
	if !seenHSBihar || !seenOSKarnataka {
		t.Fatalf("unexpected row set: %+v", rows)
	}
}

func TestQueryCutoffPool_homeStateRegionalGO(t *testing.T) {
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	_, err = database.ExecContext(ctx, `
INSERT INTO cutoff_rows (exam_type, institute, department, institute_type, state, nirf, quota, gender, seat_type, opening_rank, closing_rank) VALUES
  ('jee-main', 'Inst Goa', 'CSE', 'GFTI', 'Goa', NULL, 'GO', 'Neutral', 'OPEN', 1, 500),
  ('jee-main', 'Inst Goa', 'ECE', 'GFTI', 'Goa', NULL, 'AI', 'Neutral', 'OPEN', 1, 600)
`)
	if err != nil {
		t.Fatal(err)
	}

	nonGoa := "Bihar"
	rows, err := QueryCutoffPool(ctx, database, PoolQueryInput{
		Table:            DefaultCutoffTable,
		ExamType:         "jee-main",
		GenderDB:         "Neutral",
		Quotas:           []string{"AI", "GO"},
		InstituteTypes:   []string{"GFTI"},
		SeatTypes:        []string{"OPEN"},
		HomeState:        &nonGoa,
		ClosingRankBands: []ClosingRankBand{{TargetPool: "open", ClosingRankMin: ptrI(1), ClosingRankMax: ptrI(900)}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].Quota != "AI" {
		t.Fatalf("non-Goa domicile should drop GO rows; got %+v", rows)
	}

	goaHome := "Goa"
	rowsGoa, err := QueryCutoffPool(ctx, database, PoolQueryInput{
		Table:            DefaultCutoffTable,
		ExamType:         "jee-main",
		GenderDB:         "Neutral",
		Quotas:           []string{"AI", "GO"},
		InstituteTypes:   []string{"GFTI"},
		SeatTypes:        []string{"OPEN"},
		HomeState:        &goaHome,
		ClosingRankBands: []ClosingRankBand{{TargetPool: "open", ClosingRankMin: ptrI(1), ClosingRankMax: ptrI(900)}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(rowsGoa) != 2 {
		t.Fatalf("Goa domicile should keep GO+AI; got %d %+v", len(rowsGoa), rowsGoa)
	}
}

func TestQueryCutoffPool_emptyInstituteTypesReturnsEmpty(t *testing.T) {
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	rows, err := QueryCutoffPool(ctx, database, PoolQueryInput{
		Table:            DefaultCutoffTable,
		ExamType:         "jee-main",
		GenderDB:         "Neutral",
		Quotas:           []string{"AI", "OS"},
		InstituteTypes:   []string{},
		SeatTypes:        []string{"OPEN"},
		ClosingRankBands: []ClosingRankBand{{TargetPool: "open", ClosingRankMin: ptrI(1), ClosingRankMax: ptrI(100)}},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("expected empty rows for empty institute filters, got %+v", rows)
	}
}
