package cutoffquery

import (
	"fmt"
	"slices"
	"strings"
)

const maxRank = 1_300_000
const maxPageSize = 100

var (
	examTypes       = []string{"jee-main", "jee-advanced"}
	genderPools     = []string{"neutral", "female"}
	categories      = []string{"General", "OBC", "SC", "ST", "EWS"}
	quotaCodes      = []string{"AI", "OS", "HS", "GO", "JK", "LA"}
	instituteTypes  = []string{"IIT", "NIT", "IIIT", "GFTI"}
	targetPools     = []string{"open", "category", "open_pwd", "category_pwd"}
	quotasMainBase  = []string{"AI", "OS"}
	quotasMainFull  = []string{"AI", "OS", "HS", "GO", "JK", "LA"}
)

func containsOnly(slice []string, allowed map[string]struct{}) bool {
	for _, s := range slice {
		if _, ok := allowed[strings.TrimSpace(s)]; !ok {
			return false
		}
	}
	return true
}

func setEquals(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	ac := append([]string(nil), a...)
	bc := append([]string(nil), b...)
	slices.Sort(ac)
	slices.Sort(bc)
	return slices.Equal(ac, bc)
}

// Validate checks the cutoff query request. It returns a flat list of human-readable
// violations (empty slice means OK). Rules stay aligned with the advanced-query frontend.
func Validate(req Request) []string {
	var out []string
	add := func(msg string) { out = append(out, msg) }

	if req.Version != 1 {
		add(fmt.Sprintf("version must be 1, got %d", req.Version))
	}
	if !slices.Contains(examTypes, req.ExamType) {
		add(fmt.Sprintf("examType must be one of %v", examTypes))
	}
	if !slices.Contains(genderPools, req.GenderPool) {
		add(fmt.Sprintf("genderPool must be one of %v", genderPools))
	}
	if !slices.Contains(categories, req.Category) {
		add(fmt.Sprintf("category must be one of %v", categories))
	}
	if req.PowerMode.Combine != "union" {
		add(`powerMode.combine must be "union"`)
	}

	if req.ExamType == "jee-advanced" && HomeStatePresent(req.HomeState) {
		add("homeState must not be set for jee-advanced")
	}

	quotaSet := make(map[string]struct{}, len(quotaCodes))
	for _, q := range quotaCodes {
		quotaSet[q] = struct{}{}
	}
	if len(req.Quotas) == 0 {
		add("quotas must be non-empty")
	} else if !containsOnly(req.Quotas, quotaSet) {
		add("quotas contains unknown code (allowed: AI, OS, HS, GO, JK, LA)")
	} else if slices.Contains(examTypes, req.ExamType) {
		if req.ExamType == "jee-advanced" {
			if !setEquals(req.Quotas, quotasMainBase) {
				add("for jee-advanced, quotas must be exactly AI and OS")
			}
		} else {
			hasHome := HomeStatePresent(req.HomeState)
			if hasHome {
				if !setEquals(req.Quotas, quotasMainFull) {
					add("when homeState is set on jee-main, quotas must be exactly AI, OS, HS, GO, JK, LA")
				}
			} else {
				if !setEquals(req.Quotas, quotasMainBase) {
					add("when homeState is omitted on jee-main, quotas must be exactly AI and OS")
				}
			}
		}
	}

	if len(req.InstituteTypes) == 0 {
		add("instituteTypes must be non-empty")
	} else {
		allowedInst := make(map[string]struct{}, len(instituteTypes))
		for _, t := range instituteTypes {
			allowedInst[t] = struct{}{}
		}
		if !containsOnly(req.InstituteTypes, allowedInst) {
			add("instituteTypes contains unknown value (allowed: IIT, NIT, IIIT, GFTI)")
		} else if req.ExamType == "jee-main" && slices.Contains(req.InstituteTypes, "IIT") {
			add("instituteTypes must not include IIT for jee-main (IIT cutoffs use jee-advanced)")
		} else if req.ExamType == "jee-advanced" {
			if len(req.InstituteTypes) != 1 || req.InstituteTypes[0] != "IIT" {
				add("for jee-advanced, instituteTypes must be exactly [\"IIT\"]")
			}
		}
	}

	for i, band := range req.PowerMode.ClosingRankBands {
		prefix := fmt.Sprintf("powerMode.closingRankBands[%d]", i)
		if !slices.Contains(targetPools, band.TargetPool) {
			add(fmt.Sprintf("%s.targetPool must be one of %v", prefix, targetPools))
			continue
		}
		if !RankBandAllowed(band.TargetPool, req.Category, req.IsPwd) {
			add(fmt.Sprintf("%s.targetPool %q is not allowed for category=%q isPwd=%v", prefix, band.TargetPool, req.Category, req.IsPwd))
		}
		if band.ClosingRankMin == nil && band.ClosingRankMax == nil {
			add(fmt.Sprintf("%s: at least one of closingRankMin or closingRankMax must be set", prefix))
			continue
		}
		if band.ClosingRankMin != nil {
			if err := rankBound(prefix+".closingRankMin", *band.ClosingRankMin); err != "" {
				add(err)
			}
		}
		if band.ClosingRankMax != nil {
			if err := rankBound(prefix+".closingRankMax", *band.ClosingRankMax); err != "" {
				add(err)
			}
		}
		if band.ClosingRankMin != nil && band.ClosingRankMax != nil && *band.ClosingRankMin > *band.ClosingRankMax {
			add(fmt.Sprintf("%s: closingRankMin must be <= closingRankMax", prefix))
		}
	}
	if len(req.PowerMode.ClosingRankBands) == 0 {
		add("powerMode.closingRankBands must include at least one band with closingRankMin or closingRankMax")
	}
	if req.Pagination != nil {
		p := req.Pagination
		if !slices.Contains(targetPools, p.TargetPool) {
			add(fmt.Sprintf("pagination.targetPool must be one of %v", targetPools))
		}
		if p.Page < 1 {
			add("pagination.page must be >= 1")
		}
		if p.PageSize < 1 || p.PageSize > maxPageSize {
			add(fmt.Sprintf("pagination.pageSize must be between 1 and %d", maxPageSize))
		}
		if slices.Contains(targetPools, p.TargetPool) && !RankBandAllowed(p.TargetPool, req.Category, req.IsPwd) {
			add(fmt.Sprintf("pagination.targetPool %q is not allowed for category=%q isPwd=%v", p.TargetPool, req.Category, req.IsPwd))
		}
	}

	return out
}

func rankBound(field string, v int) string {
	if v < 1 {
		return fmt.Sprintf("%s must be >= 1", field)
	}
	if v > maxRank {
		return fmt.Sprintf("%s must be <= %d", field, maxRank)
	}
	return ""
}
