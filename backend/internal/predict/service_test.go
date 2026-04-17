package predict

import (
	"context"
	"database/sql"
	"testing"

	"jee-college-find-for-me/complete-stack/backend/internal/db"
	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	ctx := context.Background()
	database, err := db.OpenInMemory(ctx)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = database.Close() })
	return database
}

const insertSQL = `
	INSERT INTO cutoff_rows (
		exam_type, institute, department, institute_type, state, nirf,
		quota, gender, seat_type, opening_rank, closing_rank
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

func insertRow(t *testing.T, database *sql.DB, row models.CutoffRow) {
	t.Helper()
	ctx := context.Background()
	if _, err := database.ExecContext(ctx, insertSQL,
		row.ExamType, row.Institute, row.Department, row.InstituteType,
		row.State, nil, row.Quota, row.Gender, row.SeatType,
		row.OpeningRank, row.ClosingRank,
	); err != nil {
		t.Fatalf("insert row: %v", err)
	}
}

func baseRow(institute, department string, closingRank int) models.CutoffRow {
	return models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     institute,
		Department:    department,
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   10,
		ClosingRank:   closingRank,
	}
}

func TestPredictMVP(t *testing.T) {
	database := newTestDB(t)

	// User rank = 1000.
	// Range calculated in service: 500 to 1500.

	// Valid: Should be DREAM (closing < 1000)
	insertRow(t, database, baseRow("Inst Dream", "CS", 800))

	// Valid: Should be EASY (closing >= 1000)
	insertRow(t, database, baseRow("Inst Safe", "ECE", 1200))

	// Invalid: Out of bounds -> should not appear
	insertRow(t, database, baseRow("Inst Too High", "ME", 300))
	insertRow(t, database, baseRow("Inst Too Low", "CE", 2000))

	// Invalid: B.Arch should be excluded
	insertRow(t, database, baseRow("Inst Arch", "Bachelor of Architecture", 1000))

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType: "jee-main",
		Rank:     "1000",
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}

	if resp.Count != 2 {
		t.Fatalf("Count = %d, want 2 (only Inst Dream and Inst Safe)", resp.Count)
	}

	// Verify outputs
	foundDream := false
	foundEasy := false

	for _, college := range resp.Colleges {
		dept := college.Departments[0]
		if college.Institute == "Inst Dream" {
			foundDream = true
			if dept.Chance != ChanceDream {
				t.Errorf("Inst Dream chance = %q, want %q", dept.Chance, ChanceDream)
			}
		}
		if college.Institute == "Inst Safe" {
			foundEasy = true
			if dept.Chance != "easy" {
				t.Errorf("Inst Safe chance = %q, want %q", dept.Chance, "easy")
			}
		}
	}

	if !foundDream || !foundEasy {
		t.Errorf("Missing expected rows in output")
	}
}

func TestPredictFemaleMergesNeutralAndFemaleKeepingBetter(t *testing.T) {
	database := newTestDB(t)

	// Same institute + same department, two gender pools.
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst X",
		Department:    "Computer Science and Engineering",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   10,
		ClosingRank:   4000,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst X",
		Department:    "Computer Science and Engineering",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Female",
		SeatType:      "OPEN",
		OpeningRank:   10,
		ClosingRank:   6000, // Better for rank 5000 (easy)
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType: "jee-main",
		Rank:     "5000",
		Gender:   "female",
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}

	if resp.Count != 1 {
		t.Fatalf("Count = %d, want 1 merged row", resp.Count)
	}
	dept := resp.Colleges[0].Departments[0]
	if dept.ClosingRank != 6000 {
		t.Fatalf("closing_rank = %d, want 6000 (better female cutoff)", dept.ClosingRank)
	}
	if dept.GeneralClosingRank == nil || *dept.GeneralClosingRank != 4000 {
		t.Fatalf("general_closing_rank = %v, want 4000", dept.GeneralClosingRank)
	}
	if dept.FemaleClosingRank == nil || *dept.FemaleClosingRank != 6000 {
		t.Fatalf("female_closing_rank = %v, want 6000", dept.FemaleClosingRank)
	}
	if dept.Chance != ChanceEasy {
		t.Fatalf("chance = %s, want %s", dept.Chance, ChanceEasy)
	}
}

func TestPredictFemaleSelectedRowGetsGeneralRankOutsideRange(t *testing.T) {
	database := newTestDB(t)

	// User rank = 1000, range is 500-1500.
	// Female row is in range, neutral row is outside range.
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Y",
		Department:    "Electrical Engineering",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Female",
		SeatType:      "OPEN",
		OpeningRank:   20,
		ClosingRank:   1200,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Y",
		Department:    "Electrical Engineering",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   20,
		ClosingRank:   2000, // outside shortlist window, should still be shown as general_closing_rank
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType: "jee-main",
		Rank:     "1000",
		Gender:   "female",
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}

	if resp.Count != 1 {
		t.Fatalf("Count = %d, want 1", resp.Count)
	}
	dept := resp.Colleges[0].Departments[0]
	if dept.Gender != "Female" {
		t.Fatalf("selected gender = %q, want Female", dept.Gender)
	}
	if dept.GeneralClosingRank == nil || *dept.GeneralClosingRank != 2000 {
		t.Fatalf("general_closing_rank = %v, want 2000", dept.GeneralClosingRank)
	}
}