package predict

import (
	"fmt"
	"strconv"
	"strings"

	"jee-college-find-for-me/complete-stack/backend/internal/models"
)

// normalizedRequest is the stripped-down MVP form.
type normalizedRequest struct {
	ExamType     string
	Rank         int
	Mode         string
	Gender       string
	Category     string
	CategoryRank *int
	IsPWD        bool
	OpenPwdRank  *int
	CategoryPwdRank *int
	HomeState    string
	SeatType     string
}

func primaryCRLString(req models.PredictRequest) string {
	if s := strings.TrimSpace(req.Rank); s != "" {
		return s
	}
	return strings.TrimSpace(req.Score)
}

func validateRequest(req models.PredictRequest) (*normalizedRequest, error) {
	examType := strings.TrimSpace(req.ExamType)
	if examType != string(models.ExamTypeJEEMain) && examType != string(models.ExamTypeJEEAdvanced) {
		return nil, &ValidationError{Message: "examType must be jee-main or jee-advanced"}
	}

	rank, err := parseRank(primaryCRLString(req))
	if err != nil {
		return nil, err
	}

	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "General"
	}

	var categoryRank *int
	if req.CategoryRank != nil && strings.TrimSpace(*req.CategoryRank) != "" {
		parsed, err := parsePositiveInt(*req.CategoryRank, "categoryRank")
		if err != nil {
			return nil, err
		}
		categoryRank = &parsed
	}

	var openPwdRank *int
	openPwdRaw := ""
	if req.OpenPwdRank != nil {
		openPwdRaw = strings.TrimSpace(*req.OpenPwdRank)
	}
	if openPwdRaw != "" {
		parsed, err := parsePositiveInt(openPwdRaw, "openPwdRank")
		if err != nil {
			return nil, err
		}
		openPwdRank = &parsed
	}

	var categoryPwdRank *int
	categoryPwdRaw := ""
	if req.CategoryPwdRank != nil {
		categoryPwdRaw = strings.TrimSpace(*req.CategoryPwdRank)
	}
	if categoryPwdRaw != "" {
		parsed, err := parsePositiveInt(categoryPwdRaw, "categoryPwdRank")
		if err != nil {
			return nil, err
		}
		categoryPwdRank = &parsed
	}

	gender := strings.ToLower(strings.TrimSpace(req.Gender))
	if gender != "female" {
		gender = "neutral"
	}

	homeState := strings.TrimSpace(req.HomeState)
	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	switch mode {
	case "", "combined", "without-category", "category-only", "pwd-only":
	default:
		return nil, &ValidationError{Message: "mode must be combined, without-category, category-only, or pwd-only"}
	}

	return &normalizedRequest{
		ExamType:     examType,
		Rank:         rank,
		Mode:         mode,
		Gender:       gender,
		Category:     category,
		CategoryRank: categoryRank,
		IsPWD:        req.IsPWD,
		OpenPwdRank:  openPwdRank,
		CategoryPwdRank: categoryPwdRank,
		HomeState:    homeState,
		SeatType:     categorySeatType(category, req.IsPWD),
	}, nil
}

func parseRank(value string) (int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, &ValidationError{Message: "rank is required"}
	}
	return parsePositiveInt(value, "rank")
}

func parsePositiveInt(value string, field string) (int, error) {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed < 1 {
		return 0, &ValidationError{Message: fmt.Sprintf("%s must be a positive integer", field)}
	}
	return parsed, nil
}

func categorySeatType(category string, isPWD bool) string {
	pwdSuffix := ""
	if isPWD {
		pwdSuffix = " (PwD)"
	}
	switch category {
	case "OBC":
		return "OBC-NCL" + pwdSuffix
	case "SC":
		return "SC" + pwdSuffix
	case "ST":
		return "ST" + pwdSuffix
	case "EWS":
		return "EWS" + pwdSuffix
	default:
		return "OPEN" + pwdSuffix
	}
}