package predict

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

type scoredCandidate struct {
	row          models.CutoffRow
	usedRank     int
	usedRankType string
	usedCategory bool
	usedPWD      bool
	margin       float64
	chance       string
}

type rankPool struct {
	seatType     string
	rank         int
	rankType     string
	usedCategory bool
	usedPWD      bool
}

type candidateKey struct {
	institute  string
	department string
}

func buildEligiblePools(normalized *normalizedRequest, includeOpen bool, includeCategory bool) ([]rankPool, error) {
	pools := make([]rankPool, 0, 4)
	if includeOpen {
		pools = append(pools, rankPool{
			seatType: "OPEN",
			rank:     normalized.Rank,
			rankType: "general",
		})
		if normalized.IsPWD && normalized.OpenPwdRank != nil {
			pools = append(pools, rankPool{
				seatType: "OPEN (PwD)",
				rank:     *normalized.OpenPwdRank,
				rankType: "open-pwd",
				usedPWD:  true,
			})
		}
	}
	if includeCategory {
		if normalized.Category == "General" {
			return nil, &ValidationError{Message: "category-only mode requires a reserved category"}
		}
		if normalized.CategoryRank == nil {
			return nil, &ValidationError{Message: "categoryRank is required when category is not General"}
		}
		categorySeat := categorySeatType(normalized.Category, false)
		if categorySeat == "OPEN" {
			return nil, &ValidationError{Message: "invalid category seat type"}
		}
		pools = append(pools, rankPool{
			seatType:     categorySeat,
			rank:         *normalized.CategoryRank,
			rankType:     "category",
			usedCategory: true,
		})
		if normalized.IsPWD && normalized.CategoryPwdRank != nil {
			pools = append(pools, rankPool{
				seatType:     categorySeatType(normalized.Category, true),
				rank:         *normalized.CategoryPwdRank,
				rankType:     "category-pwd",
				usedCategory: true,
				usedPWD:      true,
			})
		}
	}
	if len(pools) == 0 {
		return nil, &ValidationError{Message: "no eligible seat pools for selected mode"}
	}
	return pools, nil
}

func (s *Service) predictWithPools(ctx context.Context, normalized *normalizedRequest, includeOpen bool, includeCategory bool) (*models.PredictResponse, error) {
	pools, err := buildEligiblePools(normalized, includeOpen, includeCategory)
	if err != nil {
		return nil, err
	}

	multipliers := []int{1, 5, 10, 15, 20}

	var winners map[candidateKey]scoredCandidate
	for i, m := range multipliers {
		winners = make(map[candidateKey]scoredCandidate)
		poolMatched := make(map[string]bool, len(pools))
		for _, pool := range pools {
			spread := max(1, rankSpread(pool.rank)*m)
			minRank := max(1, pool.rank-spread)
			maxRank := pool.rank + spread
			rows, err := s.fetchRowsBySeatType(ctx, normalized.ExamType, pool.seatType, minRank, maxRank, normalized.Gender, normalized.HomeState)
			if err != nil {
				return nil, err
			}
			if len(rows) > 0 {
				poolMatched[pool.seatType] = true
			}
			for _, row := range rows {
				candidate := scoreCandidate(row, pool)
				mergeBestCandidate(winners, candidate)
			}
		}
		if i == len(multipliers)-1 {
			break
		}
		if len(winners) == 0 {
			continue
		}
		allPoolsMatched := true
		for _, pool := range pools {
			if !poolMatched[pool.seatType] {
				allPoolsMatched = false
				break
			}
		}
		if allPoolsMatched {
			break
		}
	}

	if len(winners) == 0 {
		return &models.PredictResponse{
			ResolvedRank:            normalized.Rank,
			ResolvedCategoryRank:    normalized.CategoryRank,
			ResolvedOpenPwdRank:     normalized.OpenPwdRank,
			ResolvedCategoryPwdRank: normalized.CategoryPwdRank,
			Colleges:                []models.GroupedCollege{},
			Count:                   0,
		}, nil
	}

	anchors, err := s.fetchOpenNeutralAIAnchors(ctx, normalized.ExamType, winners)
	if err != nil {
		return nil, err
	}

	grouped := make([]models.GroupedCollege, 0, len(winners))
	for key, winner := range winners {
		var generalAnchorPtr *int
		if anchor, ok := anchors[key]; ok {
			a := anchor
			generalAnchorPtr = &a
		}
		dept := models.GroupedDepartment{
			Department: winner.row.Department,
			OpeningRank: winner.row.OpeningRank,
			ClosingRank: winner.row.ClosingRank,
			GeneralClosingRank: generalAnchorPtr,
			Quota: winner.row.Quota,
			Gender: winner.row.Gender,
			SeatType: winner.row.SeatType,
			Chance: winner.chance,
			UsedRank: winner.usedRank,
			RankType: winner.usedRankType,
			UsedCategory: winner.usedCategory,
			UsedPWD: winner.usedPWD,
			UsedHomeState: winner.row.Quota == "HS" || winner.row.Quota == "GO" || winner.row.Quota == "JK" || winner.row.Quota == "LA",
		}
		grouped = append(grouped, models.GroupedCollege{
			Institute: winner.row.Institute,
			InstituteType: winner.row.InstituteType,
			State: winner.row.State,
			NIRF: winner.row.NIRF,
			Departments: []models.GroupedDepartment{dept},
		})
	}

	if err := s.enrichCompanionGenderRanksForCategory(ctx, normalized.ExamType, grouped); err != nil {
		return nil, err
	}

	sort.Slice(grouped, func(i, j int) bool {
		li := grouped[i]
		lj := grouped[j]
		ldi := li.Departments[0]
		ldj := lj.Departments[0]
		lc := 0
		if ldi.Chance == ChanceEasy {
			lc = 1
		}
		rc := 0
		if ldj.Chance == ChanceEasy {
			rc = 1
		}
		if lc != rc {
			return lc < rc // dream first, then easy
		}
		aki := anchors[candidateKey{institute: li.Institute, department: ldi.Department}]
		akj := anchors[candidateKey{institute: lj.Institute, department: ldj.Department}]
		if aki == 0 {
			aki = ldi.ClosingRank + math.MaxInt32/4
		}
		if akj == 0 {
			akj = ldj.ClosingRank + math.MaxInt32/4
		}
		if aki != akj {
			return aki < akj
		}
		if ldi.ClosingRank != ldj.ClosingRank {
			return ldi.ClosingRank < ldj.ClosingRank
		}
		if li.Institute != lj.Institute {
			return li.Institute < lj.Institute
		}
		return ldi.Department < ldj.Department
	})

	return &models.PredictResponse{
		ResolvedRank:            normalized.Rank,
		ResolvedCategoryRank:    normalized.CategoryRank,
		ResolvedOpenPwdRank:     normalized.OpenPwdRank,
		ResolvedCategoryPwdRank: normalized.CategoryPwdRank,
		Colleges:                grouped,
		Count:                   len(grouped),
	}, nil
}

func (s *Service) fetchRowsBySeatType(ctx context.Context, examType string, seatType string, minRank int, maxRank int, userGender string, userHomeState string) ([]models.CutoffRow, error) {
	genderClause := `AND gender = 'Neutral'`
	if userGender == "female" {
		genderClause = `AND (gender = 'Neutral' OR gender = 'Female')`
	}

	var quotaClause string
	args := []any{examType, seatType, minRank, maxRank}
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
		WHERE exam_type = ?
		  AND seat_type = ?
		  AND closing_rank BETWEEN ? AND ?
		  AND department NOT LIKE '%%Bachelor of Architecture%%'
		  AND department NOT LIKE '%%Bachelor of Planning%%'
		  AND department NOT LIKE '%%Preparatory%%'
		  %s
		  %s
	`, genderClause, quotaClause)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query seat type rows: %w", err)
	}
	defer rows.Close()

	out := make([]models.CutoffRow, 0)
	for rows.Next() {
		var row models.CutoffRow
		var nirf *string
		if err := rows.Scan(
			&row.ID, &row.ExamType, &row.Institute, &row.Department,
			&row.InstituteType, &row.State, &nirf,
			&row.Quota, &row.Gender, &row.SeatType,
			&row.OpeningRank, &row.ClosingRank,
		); err != nil {
			return nil, fmt.Errorf("scan seat type row: %w", err)
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func scoreCandidate(row models.CutoffRow, pool rankPool) scoredCandidate {
	chance := ChanceDream
	if row.ClosingRank >= pool.rank {
		chance = ChanceEasy
	}
	margin := float64(row.ClosingRank-pool.rank) / float64(max(1, pool.rank))
	return scoredCandidate{
		row: row,
		usedRank: pool.rank,
		usedRankType: pool.rankType,
		usedCategory: pool.usedCategory,
		usedPWD: pool.usedPWD,
		margin: margin,
		chance: chance,
	}
}

func mergeBestCandidate(winners map[candidateKey]scoredCandidate, incoming scoredCandidate) {
	key := candidateKey{institute: incoming.row.Institute, department: incoming.row.Department}
	existing, found := winners[key]
	if !found {
		winners[key] = incoming
		return
	}

	existingChanceScore := 0
	if existing.chance == ChanceEasy {
		existingChanceScore = 1
	}
	incomingChanceScore := 0
	if incoming.chance == ChanceEasy {
		incomingChanceScore = 1
	}
	if incomingChanceScore != existingChanceScore {
		if incomingChanceScore > existingChanceScore {
			winners[key] = incoming
		}
		return
	}
	if incoming.margin != existing.margin {
		if incoming.margin > existing.margin {
			winners[key] = incoming
		}
		return
	}
	if incoming.row.ClosingRank > existing.row.ClosingRank {
		winners[key] = incoming
	}
}

func (s *Service) enrichCompanionGenderRanksForCategory(ctx context.Context, examType string, colleges []models.GroupedCollege) error {
	type companionKey struct {
		institute  string
		department string
		seatType   string
		quota      string
	}
	const keysPerBatch = 400

	keys := make([]companionKey, 0, len(colleges))
	seen := make(map[companionKey]struct{})
	for _, c := range colleges {
		if len(c.Departments) == 0 {
			continue
		}
		d := c.Departments[0]
		key := companionKey{
			institute:  c.Institute,
			department: d.Department,
			seatType:   d.SeatType,
			quota:      d.Quota,
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		keys = append(keys, key)
	}
	if len(keys) == 0 {
		return nil
	}

	type genderRanks struct {
		neutral *int
		female  *int
	}
	ranksByKey := make(map[companionKey]genderRanks, len(keys))

	for start := 0; start < len(keys); start += keysPerBatch {
		end := start + keysPerBatch
		if end > len(keys) {
			end = len(keys)
		}
		batch := keys[start:end]

		whereParts := make([]string, 0, len(batch))
		args := make([]any, 0, 1+len(batch)*4)
		args = append(args, examType)
		for _, key := range batch {
			whereParts = append(whereParts, "(institute = ? AND department = ? AND seat_type = ? AND quota = ?)")
			args = append(args, key.institute, key.department, key.seatType, key.quota)
		}

		query := fmt.Sprintf(`
			SELECT institute, department, seat_type, quota, gender, MAX(closing_rank) AS closing_rank
			FROM cutoff_rows
			WHERE exam_type = ?
			  AND (%s)
			GROUP BY institute, department, seat_type, quota, gender
		`, strings.Join(whereParts, " OR "))

		rows, err := s.db.QueryContext(ctx, query, args...)
		if err != nil {
			return fmt.Errorf("query companion gender ranks: %w", err)
		}
		for rows.Next() {
			var institute, department, seatType, quota, gender string
			var closingRank int
			if err := rows.Scan(&institute, &department, &seatType, &quota, &gender, &closingRank); err != nil {
				_ = rows.Close()
				return fmt.Errorf("scan companion gender ranks: %w", err)
			}
			key := companionKey{institute: institute, department: department, seatType: seatType, quota: quota}
			gr := ranksByKey[key]
			switch gender {
			case string(models.GenderNeutral):
				r := closingRank
				gr.neutral = &r
			case string(models.GenderFemale):
				r := closingRank
				gr.female = &r
			}
			ranksByKey[key] = gr
		}
		if err := rows.Err(); err != nil {
			_ = rows.Close()
			return fmt.Errorf("iterate companion gender ranks: %w", err)
		}
		if err := rows.Close(); err != nil {
			return fmt.Errorf("close companion gender ranks rows: %w", err)
		}
	}

	for i := range colleges {
		if len(colleges[i].Departments) == 0 {
			continue
		}
		d := &colleges[i].Departments[0]
		key := companionKey{
			institute:  colleges[i].Institute,
			department: d.Department,
			seatType:   d.SeatType,
			quota:      d.Quota,
		}
		if gr, ok := ranksByKey[key]; ok {
			d.FemaleClosingRank = gr.female
		}
	}
	return nil
}

func (s *Service) fetchOpenNeutralAIAnchors(ctx context.Context, examType string, winners map[candidateKey]scoredCandidate) (map[candidateKey]int, error) {
	const keysPerBatch = 400

	keys := make([]candidateKey, 0, len(winners))
	for k := range winners {
		keys = append(keys, k)
	}

	anchors := make(map[candidateKey]int, len(winners))
	for start := 0; start < len(keys); start += keysPerBatch {
		end := start + keysPerBatch
		if end > len(keys) {
			end = len(keys)
		}
		batch := keys[start:end]

		whereParts := make([]string, 0, len(batch))
		args := make([]any, 0, 1+len(batch)*2)
		args = append(args, examType)
		for _, key := range batch {
			whereParts = append(whereParts, "(institute = ? AND department = ?)")
			args = append(args, key.institute, key.department)
		}

		query := fmt.Sprintf(`
			SELECT institute, department, MAX(closing_rank) AS anchor_rank
			FROM cutoff_rows
			WHERE exam_type = ?
			  AND seat_type = 'OPEN'
			  AND gender = 'Neutral'
			  AND quota IN ('AI', 'OS')
			  AND (%s)
			GROUP BY institute, department
		`, strings.Join(whereParts, " OR "))

		rows, err := s.db.QueryContext(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("query open-neutral-ai anchors: %w", err)
		}
		for rows.Next() {
			var institute, department string
			var anchor int
			if err := rows.Scan(&institute, &department, &anchor); err != nil {
				_ = rows.Close()
				return nil, fmt.Errorf("scan open-neutral-ai anchors: %w", err)
			}
			anchors[candidateKey{institute: institute, department: department}] = anchor
		}
		if err := rows.Err(); err != nil {
			_ = rows.Close()
			return nil, fmt.Errorf("iterate open-neutral-ai anchors: %w", err)
		}
		_ = rows.Close()
	}

	return anchors, nil
}
