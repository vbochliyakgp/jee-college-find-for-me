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

func TestPredictJeeMainHomeStateQuotaRouting(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Home NIT",
		Department:    "CS",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "HS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   1200,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Home-State OS Should Exclude",
		Department:    "ECE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   1100,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "AI College",
		Department:    "ME",
		InstituteType: "IIIT",
		State:         "Karnataka",
		Quota:         "AI",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   1000,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Other NIT",
		Department:    "CE",
		InstituteType: "NIT",
		State:         "Rajasthan",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   1300,
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:  "jee-main",
		Rank:      "1000",
		HomeState: "Delhi",
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}

	got := map[string]string{}
	for _, c := range resp.Colleges {
		got[c.Institute] = c.Departments[0].Quota
	}

	if got["Home NIT"] != "HS" {
		t.Fatalf("Home NIT quota = %q, want HS", got["Home NIT"])
	}
	if got["AI College"] != "AI" {
		t.Fatalf("AI College quota = %q, want AI", got["AI College"])
	}
	if got["Other NIT"] != "OS" {
		t.Fatalf("Other NIT quota = %q, want OS", got["Other NIT"])
	}
	if _, exists := got["Home-State OS Should Exclude"]; exists {
		t.Fatalf("home-state OS row should not be eligible")
	}
}

func TestPredictJeeMainRegionalQuotaGOIncludedForMatchingState(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Goa Institute",
		Department:    "CS",
		InstituteType: "GFTI",
		State:         "Goa",
		Quota:         "GO",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   1200,
	})

	service := NewService(database)
	respWithHS, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:  "jee-main",
		Rank:      "1000",
		HomeState: "Goa",
	})
	if err != nil {
		t.Fatalf("predict with Goa home state: %v", err)
	}
	if respWithHS.Count == 0 {
		t.Fatalf("expected GO quota row for matching home state")
	}
	if q := respWithHS.Colleges[0].Departments[0].Quota; q != "GO" {
		t.Fatalf("quota = %q, want GO", q)
	}

	respNoHS, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType: "jee-main",
		Rank:     "1000",
	})
	if err != nil {
		t.Fatalf("predict without home state: %v", err)
	}
	if respNoHS.Count != 0 {
		t.Fatalf("expected GO quota row to be excluded without home state")
	}
}

func TestPredictJeeMainRegionalQuotaLAIncludedForLadakh(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "National Institute of Technology, Srinagar",
		Department:    "Computer Science and Engineering",
		InstituteType: "NIT",
		State:         "Jammu and Kashmir",
		Quota:         "LA",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   220991,
	})

	service := NewService(database)
	respWithLadakh, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:  "jee-main",
		Rank:      "220000",
		HomeState: "Ladakh",
	})
	if err != nil {
		t.Fatalf("predict with Ladakh home state: %v", err)
	}
	if respWithLadakh.Count == 0 {
		t.Fatalf("expected LA quota row for Ladakh home state")
	}
	if q := respWithLadakh.Colleges[0].Departments[0].Quota; q != "LA" {
		t.Fatalf("quota = %q, want LA", q)
	}
}

func TestPredictCategoryPathUsesCategoryRankAndSeatType(t *testing.T) {
	database := newTestDB(t)

	// Same branch exposed through OPEN and OBC-NCL seats.
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Cat",
		Department:    "Mechanical Engineering",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   9000, // dream for CRL=10000
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Cat",
		Department:    "Mechanical Engineering",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OBC-NCL",
		OpeningRank:   1,
		ClosingRank:   2800, // easy for catRank=2000 and inside category window
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:     "jee-main",
		Rank:         "10000",
		Category:     "OBC",
		CategoryRank: ptr("2000"),
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}

	if resp.Count != 1 {
		t.Fatalf("count = %d, want 1", resp.Count)
	}
	foundCategoryWinner := false
	for _, c := range resp.Colleges {
		d := c.Departments[0]
		if c.Institute == "Inst Cat" && d.Department == "Mechanical Engineering" {
			foundCategoryWinner = true
			if d.SeatType != "OBC-NCL" {
				t.Fatalf("seat_type = %q, want OBC-NCL", d.SeatType)
			}
			if d.RankType != "category" {
				t.Fatalf("rank_type = %q, want category", d.RankType)
			}
			if d.UsedRank != 2000 {
				t.Fatalf("used_rank = %d, want 2000", d.UsedRank)
			}
			if d.Chance != ChanceEasy {
				t.Fatalf("chance = %q, want %q", d.Chance, ChanceEasy)
			}
		}
	}
	if !foundCategoryWinner {
		t.Fatalf("expected Inst Cat Mechanical to appear in response")
	}
}

func TestPredictCategoryPathRequiresCategoryRank(t *testing.T) {
	database := newTestDB(t)
	service := NewService(database)

	_, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType: "jee-main",
		Rank:     "10000",
		Category: "OBC",
	})
	if err == nil {
		t.Fatalf("expected error when category rank is missing")
	}
}

func TestPredictCategoryCompanionGenderRanksAndChanceOrdering(t *testing.T) {
	database := newTestDB(t)

	// Easy row (category seat) with both neutral and female pools.
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Easy",
		Department:    "CS",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   6400, // anchor baseline
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Easy",
		Department:    "CS",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OBC-NCL",
		OpeningRank:   1,
		ClosingRank:   2600,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Easy",
		Department:    "CS",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Female",
		SeatType:      "OBC-NCL",
		OpeningRank:   1,
		ClosingRank:   3000,
	})

	// Dream row (category seat).
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Dream",
		Department:    "ECE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OBC-NCL",
		OpeningRank:   1,
		ClosingRank:   1800,
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:     "jee-main",
		Rank:         "5000",
		Category:     "OBC",
		CategoryRank: ptr("2000"),
		Gender:       "female",
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}
	if resp.Count < 2 {
		t.Fatalf("count = %d, want at least 2", resp.Count)
	}

	// Dream must appear before easy in the final ordering.
	first := resp.Colleges[0].Departments[0]
	second := resp.Colleges[1].Departments[0]
	if first.Chance != ChanceDream {
		t.Fatalf("first chance = %q, want dream", first.Chance)
	}
	if second.Chance != ChanceEasy {
		t.Fatalf("second chance = %q, want easy", second.Chance)
	}

	// Companion ranks should be attached for category-selected winner.
	foundEasy := false
	for _, c := range resp.Colleges {
		d := c.Departments[0]
		if c.Institute == "Inst Easy" && d.Department == "CS" {
			foundEasy = true
			if d.GeneralClosingRank == nil || *d.GeneralClosingRank != 6400 {
				t.Fatalf("general_closing_rank = %v, want 6400", d.GeneralClosingRank)
			}
			if d.FemaleClosingRank == nil || *d.FemaleClosingRank != 3000 {
				t.Fatalf("female_closing_rank = %v, want 3000", d.FemaleClosingRank)
			}
		}
	}
	if !foundEasy {
		t.Fatalf("Inst Easy CS winner not found")
	}
}

func TestPredictGeneralPWDUsesOpenPwdRankScale(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst PwD",
		Department:    "CSE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   14000, // dream for CRL=20000
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst PwD",
		Department:    "CSE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN (PwD)",
		OpeningRank:   1,
		ClosingRank:   60, // easy for openPwdRank=45
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:    "jee-main",
		Rank:        "20000",
		Category:    "General",
		IsPWD:       true,
		OpenPwdRank: ptr("45"),
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}
	if resp.Count != 1 {
		t.Fatalf("count = %d, want 1", resp.Count)
	}
	dept := resp.Colleges[0].Departments[0]
	if dept.SeatType != "OPEN (PwD)" {
		t.Fatalf("seat_type = %q, want OPEN (PwD)", dept.SeatType)
	}
	if dept.RankType != "open-pwd" {
		t.Fatalf("rank_type = %q, want open-pwd", dept.RankType)
	}
	if dept.UsedRank != 45 {
		t.Fatalf("used_rank = %d, want 45", dept.UsedRank)
	}
	if !dept.UsedPWD {
		t.Fatalf("used_pwd = false, want true")
	}
}

func TestPredictCategoryPWDChoosesBestPoolAndCarriesPathMetadata(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Matrix",
		Department:    "ECE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN",
		OpeningRank:   1,
		ClosingRank:   12000,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Matrix",
		Department:    "ECE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OBC-NCL",
		OpeningRank:   1,
		ClosingRank:   2500,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Matrix",
		Department:    "ECE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN (PwD)",
		OpeningRank:   1,
		ClosingRank:   550,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Matrix",
		Department:    "ECE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OBC-NCL (PwD)",
		OpeningRank:   1,
		ClosingRank:   300,
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:         "jee-main",
		Rank:             "10000",
		Category:         "OBC",
		CategoryRank:     ptr("2000"),
		IsPWD:            true,
		OpenPwdRank:      ptr("500"),
		CategoryPwdRank:  ptr("100"),
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}
	if resp.Count != 1 {
		t.Fatalf("count = %d, want 1", resp.Count)
	}
	dept := resp.Colleges[0].Departments[0]
	if dept.SeatType != "OBC-NCL (PwD)" {
		t.Fatalf("seat_type = %q, want OBC-NCL (PwD)", dept.SeatType)
	}
	if dept.RankType != "category-pwd" {
		t.Fatalf("rank_type = %q, want category-pwd", dept.RankType)
	}
	if dept.UsedRank != 100 {
		t.Fatalf("used_rank = %d, want 100", dept.UsedRank)
	}
	if !dept.UsedCategory || !dept.UsedPWD {
		t.Fatalf("expected used_category and used_pwd to be true")
	}
}

func TestPredictFemalePWDConsidersNeutralAndFemalePools(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Female PwD",
		Department:    "EE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Neutral",
		SeatType:      "OPEN (PwD)",
		OpeningRank:   1,
		ClosingRank:   60,
	})
	insertRow(t, database, models.CutoffRow{
		ExamType:      "jee-main",
		Institute:     "Inst Female PwD",
		Department:    "EE",
		InstituteType: "NIT",
		State:         "Delhi",
		Quota:         "OS",
		Gender:        "Female",
		SeatType:      "OPEN (PwD)",
		OpeningRank:   1,
		ClosingRank:   80, // easier; should win for female request
	})

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType:    "jee-main",
		Rank:        "15000",
		Gender:      "female",
		Category:    "General",
		IsPWD:       true,
		OpenPwdRank: ptr("50"),
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}
	if resp.Count != 1 {
		t.Fatalf("count = %d, want 1", resp.Count)
	}
	dept := resp.Colleges[0].Departments[0]
	if dept.Gender != "Female" {
		t.Fatalf("selected gender = %q, want Female", dept.Gender)
	}
	if dept.SeatType != "OPEN (PwD)" {
		t.Fatalf("seat_type = %q, want OPEN (PwD)", dept.SeatType)
	}
}

func TestPredictExcludesPreparatoryRows(t *testing.T) {
	database := newTestDB(t)

	insertRow(t, database, baseRow("Inst Normal", "Computer Science and Engineering", 1200))
	insertRow(t, database, baseRow("Inst Prep", "Preparatory Course in Engineering", 1200))

	service := NewService(database)
	resp, err := service.Predict(context.Background(), models.PredictRequest{
		ExamType: "jee-main",
		Rank:     "1000",
	})
	if err != nil {
		t.Fatalf("predict: %v", err)
	}
	if resp.Count != 1 {
		t.Fatalf("count = %d, want 1", resp.Count)
	}
	if resp.Colleges[0].Institute != "Inst Normal" {
		t.Fatalf("institute = %q, want Inst Normal", resp.Colleges[0].Institute)
	}
}

func ptr(v string) *string { return &v }