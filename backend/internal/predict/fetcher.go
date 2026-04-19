package predict

import (
	"context"
	"fmt"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

const (
	ChanceDream = "dream"
	ChanceEasy  = "easy"
)

type ScoredRow struct {
	Row    models.CutoffRow
	Chance string
}

// fetchBaseGeneralRows is the step 1 simplified fetcher.
func (s *Service) fetchBaseGeneralRows(ctx context.Context, examType string, userRank int, minRank int, maxRank int, userGender string, userHomeState string) ([]ScoredRow, error) {
	genderClause := `AND gender = 'Neutral'`
	if userGender == "female" {
		genderClause = `AND (gender = 'Neutral' OR gender = 'Female')`
	}

	var quotaClause string
	args := []any{examType, minRank, maxRank}
	if userHomeState == "" {
		quotaClause = `AND quota IN ('AI', 'OS')`
	} else {
		quotaClause = `AND (
			quota = 'AI' OR
			(quota = 'HS' AND state = ?) OR
			(quota = 'GO' AND ? = 'Goa') OR
			(quota = 'JK' AND ? = 'Jammu and Kashmir') OR
			(quota = 'LA' AND ? = 'Ladakh') OR
			(quota = 'OS' AND state != ?)
		)`
		args = append(args, userHomeState, userHomeState, userHomeState, userHomeState, userHomeState)
	}

	query := fmt.Sprintf(`
		SELECT id, exam_type, institute, department, institute_type, state, nirf,
		       quota, gender, seat_type, opening_rank, closing_rank
		FROM cutoff_rows
		WHERE seat_type = 'OPEN' 
		  AND exam_type = ?
		  AND closing_rank BETWEEN ? AND ?
		  AND department NOT LIKE '%%Bachelor of Architecture%%'
		  AND department NOT LIKE '%%Bachelor of Planning%%'
		  AND department NOT LIKE '%%Preparatory%%'
		  %s
		  %s
		ORDER BY closing_rank ASC;
	`, genderClause, quotaClause)

	// Note: We are ignoring quotas (HS/OS) and genders for this MVP step.
	// This assumes you want a completely raw baseline.
	dbRows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query base rows: %w", err)
	}
	defer dbRows.Close()

	var out []ScoredRow
	for dbRows.Next() {
		var row models.CutoffRow
		var nirf *string // Simplified null handling for brevity
		
		if err := dbRows.Scan(
			&row.ID, &row.ExamType, &row.Institute, &row.Department,
			&row.InstituteType, &row.State, &nirf,
			&row.Quota, &row.Gender, &row.SeatType,
			&row.OpeningRank, &row.ClosingRank,
		); err != nil {
			return nil, fmt.Errorf("scan optimal row: %w", err)
		}

		var chance string
		if row.ClosingRank < userRank {
			chance = ChanceDream
		} else {
			chance = ChanceEasy
		}

		out = append(out, ScoredRow{
			Row:    row,
			Chance: chance,
		})
	}
	return out, dbRows.Err()
}