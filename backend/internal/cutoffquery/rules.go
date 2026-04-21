package cutoffquery

import "strings"

// HomeStatePresent reports whether a home-state value was sent (JEE Main only).
func HomeStatePresent(h *string) bool {
	return h != nil && strings.TrimSpace(*h) != ""
}

// RankBandAllowed mirrors frontend rules: which logical pools may appear for this candidate context.
func RankBandAllowed(targetPool, category string, isPwd bool) bool {
	switch targetPool {
	case "open":
		return true
	case "category":
		return category != "General"
	case "open_pwd":
		return isPwd
	case "category_pwd":
		return isPwd && category != "General"
	default:
		return false
	}
}
