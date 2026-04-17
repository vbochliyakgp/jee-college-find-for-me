package predict

import (
	"sort"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

// groupByCollege converts scored rows directly into response rows.
func groupByCollege(rows []ScoredRow) []models.GroupedCollege {
	type deptKey struct {
		institute  string
		department string
	}
	best := make(map[deptKey]ScoredRow, len(rows))
	generalRankByDept := make(map[deptKey]int, len(rows))
	femaleRankByDept := make(map[deptKey]int, len(rows))

	for _, sr := range rows {
		key := deptKey{institute: sr.Row.Institute, department: sr.Row.Department}
		existing, found := best[key]
		if !found || sr.Row.ClosingRank > existing.Row.ClosingRank {
			best[key] = sr
		}
		if sr.Row.Gender == string(models.GenderNeutral) {
			generalRankByDept[key] = sr.Row.ClosingRank
		}
		if sr.Row.Gender == string(models.GenderFemale) {
			femaleRankByDept[key] = sr.Row.ClosingRank
		}
	}

	result := make([]models.GroupedCollege, 0, len(best))
	for _, sr := range best {
		row := sr.Row
		key := deptKey{institute: row.Institute, department: row.Department}
		generalRank, hasGeneralRank := generalRankByDept[key]
		femaleRank, hasFemaleRank := femaleRankByDept[key]

		var generalRankPtr *int
		if hasGeneralRank {
			generalRankPtr = &generalRank
		}
		var femaleRankPtr *int
		if hasFemaleRank {
			femaleRankPtr = &femaleRank
		}

		dept := models.GroupedDepartment{
			Department:         row.Department,
			OpeningRank:        row.OpeningRank,
			ClosingRank:        row.ClosingRank,
			GeneralClosingRank: generalRankPtr,
			FemaleClosingRank:  femaleRankPtr,
			Quota:              row.Quota,
			Gender:             row.Gender,
			SeatType:           row.SeatType,
			Chance:             sr.Chance, // "dream" or "easy"
		}
		result = append(result, models.GroupedCollege{
			Institute:     row.Institute,
			InstituteType: row.InstituteType,
			State:         row.State,
			NIRF:          row.NIRF,
			Departments:   []models.GroupedDepartment{dept},
		})
	}

	sort.Slice(result, func(i, j int) bool {
		left := result[i].Departments[0]
		right := result[j].Departments[0]

		if left.ClosingRank != right.ClosingRank {
			return left.ClosingRank < right.ClosingRank
		}
		if result[i].Institute != result[j].Institute {
			return result[i].Institute < result[j].Institute
		}
		return left.Department < right.Department
	})

	return result
}