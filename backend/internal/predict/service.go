package predict

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

type Service struct {
	db *sql.DB
}

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

func NewService(database *sql.DB) *Service {
	return &Service{db: database}
}

func rankSpread(rank int) int {
	switch {
	case rank <= 100:
		return 120
	case rank <= 300:
		return 220
	case rank <= 700:
		return max(320, int(0.55*float64(rank)))
	case rank <= 1500:
		return max(550, int(0.50*float64(rank)))
	case rank <= 3000:
		return max(900, int(0.45*float64(rank)))
	case rank <= 6000:
		return max(1500, int(0.40*float64(rank)))
	case rank <= 12000:
		return max(2800, int(0.34*float64(rank)))
	case rank <= 25000:
		return max(5000, int(0.28*float64(rank)))
	case rank <= 50000:
		return max(8500, int(0.22*float64(rank)))
	case rank <= 100000:
		return max(13000, int(0.18*float64(rank)))
	default:
		return max(18000, int(0.15*float64(rank)))
	}
}

func (s *Service) Predict(ctx context.Context, req models.PredictRequest) (*models.PredictResponse, error) {
	normalized, err := validateRequest(req)
	if err != nil {
		return nil, err
	}

	// Try up to 5 widening windows when no rows are found.
	// This avoids dead-end "no rows matched" for sparse rank bands.
	baseSpread := rankSpread(normalized.Rank)
	multipliers := []int{1, 5, 10, 15, 20}

	var rows []ScoredRow
	for i, m := range multipliers {
		spread := max(1, baseSpread*m)
		minRank := max(1, normalized.Rank-spread)
		maxRank := normalized.Rank + spread

		rows, err = s.fetchBaseGeneralRows(ctx, normalized.ExamType, normalized.Rank, minRank, maxRank, normalized.Gender, normalized.HomeState)
		if err != nil {
			return nil, err
		}
		if len(rows) > 0 || i == len(multipliers)-1 {
			break
		}
	}

	grouped := groupByCollege(rows)
	if err := s.enrichMissingNeutralClosingRanks(ctx, normalized.ExamType, grouped); err != nil {
		return nil, err
	}
	return &models.PredictResponse{
		ResolvedRank: normalized.Rank,
		Colleges:     grouped,
		Count:        len(grouped),
	}, nil
}

func (s *Service) Filters(ctx context.Context) (*models.FiltersResponse, error) {
	states, err := s.distinctStrings(ctx, `SELECT DISTINCT state FROM cutoff_rows WHERE state <> '' ORDER BY state`)
	if err != nil {
		return nil, err
	}
	instituteTypes, err := s.distinctStrings(ctx, `SELECT DISTINCT institute_type FROM cutoff_rows ORDER BY institute_type`)
	if err != nil {
		return nil, err
	}
	quotas, err := s.distinctStrings(ctx, `SELECT DISTINCT quota FROM cutoff_rows ORDER BY quota`)
	if err != nil {
		return nil, err
	}
	seatTypes, err := s.distinctStrings(ctx, `SELECT DISTINCT seat_type FROM cutoff_rows ORDER BY seat_type`)
	if err != nil {
		return nil, err
	}
	genders, err := s.distinctStrings(ctx, `SELECT DISTINCT gender FROM cutoff_rows ORDER BY gender`)
	if err != nil {
		return nil, err
	}

	return &models.FiltersResponse{
		States:         states,
		InstituteTypes: instituteTypes,
		Quotas:         quotas,
		SeatTypes:      seatTypes,
		Genders:        genders,
	}, nil
}

func (s *Service) distinctStrings(ctx context.Context, query string) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query distinct values: %w", err)
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("scan distinct value: %w", err)
		}
		out = append(out, value)
	}
	return out, rows.Err()
}

func (s *Service) enrichMissingNeutralClosingRanks(ctx context.Context, examType string, colleges []models.GroupedCollege) error {
	type deptKey struct {
		institute  string
		department string
	}
	const keysPerBatch = 400

	keys := make([]deptKey, 0)
	seen := make(map[deptKey]struct{})
	for _, college := range colleges {
		if len(college.Departments) == 0 {
			continue
		}
		dept := college.Departments[0]
		if dept.Gender != string(models.GenderFemale) || dept.GeneralClosingRank != nil {
			continue
		}
		key := deptKey{institute: college.Institute, department: dept.Department}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		keys = append(keys, key)
	}

	if len(keys) == 0 {
		return nil
	}

	neutralRankByKey := make(map[deptKey]int, len(keys))
	for start := 0; start < len(keys); start += keysPerBatch {
		end := start + keysPerBatch
		if end > len(keys) {
			end = len(keys)
		}
		batch := keys[start:end]

		var whereParts []string
		args := make([]any, 0, 1+len(batch)*2)
		args = append(args, examType)
		for _, key := range batch {
			whereParts = append(whereParts, "(institute = ? AND department = ?)")
			args = append(args, key.institute, key.department)
		}

		query := fmt.Sprintf(`
			SELECT institute, department, MAX(closing_rank) AS neutral_closing_rank
			FROM cutoff_rows
			WHERE exam_type = ?
			  AND seat_type = 'OPEN'
			  AND gender = 'Neutral'
			  AND (%s)
			GROUP BY institute, department
		`, strings.Join(whereParts, " OR "))

		rows, err := s.db.QueryContext(ctx, query, args...)
		if err != nil {
			return fmt.Errorf("query neutral rank enrichment: %w", err)
		}

		for rows.Next() {
			var inst, dept string
			var rank int
			if err := rows.Scan(&inst, &dept, &rank); err != nil {
				_ = rows.Close()
				return fmt.Errorf("scan neutral rank enrichment: %w", err)
			}
			neutralRankByKey[deptKey{institute: inst, department: dept}] = rank
		}
		if err := rows.Err(); err != nil {
			_ = rows.Close()
			return fmt.Errorf("iterate neutral rank enrichment: %w", err)
		}
		if err := rows.Close(); err != nil {
			return fmt.Errorf("close neutral rank enrichment rows: %w", err)
		}
	}

	for i := range colleges {
		if len(colleges[i].Departments) == 0 {
			continue
		}
		dept := &colleges[i].Departments[0]
		if dept.Gender != string(models.GenderFemale) || dept.GeneralClosingRank != nil {
			continue
		}
		key := deptKey{institute: colleges[i].Institute, department: dept.Department}
		if rank, ok := neutralRankByKey[key]; ok {
			r := rank
			dept.GeneralClosingRank = &r
		}
	}

	return nil
}